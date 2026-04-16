#!/usr/bin/env python3
"""
SOMA Fine-tuning Pipeline
=========================
Trains google/gemma-3-4b-it on SOMA's conversation data using LoRA via Unsloth.
Exports to Q4_K_M GGUF and registers as 'soma' in Ollama.

One model. Always named 'soma'. Always getting smarter.

Usage:
  python train-soma-llama.py --data ./SOMA/training-data/soma-training-*.jsonl

The --data flag accepts the JSONL output from TrainingDataExporter.
"""

import argparse
import json
import os

# Disable torch.compile / inductor / triton BEFORE any torch import.
# Triton on Windows requires a C compiler to JIT-compile CUDA kernels.
# Training still runs fully on GPU — we just skip kernel auto-tuning.
os.environ.setdefault('TORCHDYNAMO_DISABLE', '1')
os.environ.setdefault('TORCHINDUCTOR_DISABLE', '1')
os.environ.setdefault('TORCH_COMPILE_DISABLE', '1')

import subprocess
import sys
import time
from pathlib import Path


def install_deps():
    """Install unsloth + trl if not present."""
    missing = []
    try:
        import unsloth  # noqa
    except ImportError:
        missing.append("unsloth[colab-new]")
    try:
        import trl  # noqa
    except ImportError:
        missing.append("trl")
    if missing:
        print(f"[SOMA Train] Installing: {', '.join(missing)}")
        subprocess.run(
            [sys.executable, "-m", "pip", "install"] + missing,
            check=True, capture_output=False
        )


def load_jsonl(path, max_samples):
    """Load SOMA's JSONL training data. Supports messages, alpaca, and sharegpt formats."""
    samples = []
    path = Path(path)

    # Support glob patterns — pick the newest file if multiple match
    if not path.exists():
        parent = path.parent
        pattern = path.name
        candidates = sorted(parent.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
        if not candidates:
            raise FileNotFoundError(f"No training data found matching: {path}")
        path = candidates[0]
        print(f"[SOMA Train] Using newest file: {path.name}")

    alpaca_converted = 0
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)

                # Format 1: messages (native — TrainingDataExporter gemma mode, synthetic data)
                if "messages" in obj:
                    msgs = obj["messages"]
                    if len(msgs) >= 2 and any(m["role"] == "assistant" for m in msgs):
                        samples.append(msgs)

                # Format 2: alpaca (instruction/input/output or instruction/response)
                elif "instruction" in obj or "input" in obj:
                    user_text = obj.get("input") or obj.get("instruction", "")
                    asst_text = obj.get("output") or obj.get("response", "")
                    system_text = obj.get("system") or obj.get("instruction", "") if "input" in obj else ""
                    if user_text and asst_text:
                        msgs = []
                        if system_text:
                            msgs.append({"role": "system", "content": system_text})
                        msgs.append({"role": "user", "content": user_text})
                        msgs.append({"role": "assistant", "content": asst_text})
                        samples.append(msgs)
                        alpaca_converted += 1

                # Format 3: sharegpt (conversations list with from/value)
                elif "conversations" in obj:
                    convs = obj["conversations"]
                    role_map = {"human": "user", "gpt": "assistant", "system": "system"}
                    msgs = [{"role": role_map.get(c["from"], c["from"]), "content": c["value"]}
                            for c in convs if "from" in c and "value" in c]
                    if len(msgs) >= 2 and any(m["role"] == "assistant" for m in msgs):
                        samples.append(msgs)

            except (json.JSONDecodeError, KeyError):
                continue

    if alpaca_converted:
        print(f"[SOMA Train] Converted {alpaca_converted} alpaca-format samples to messages format")
    print(f"[SOMA Train] Loaded {len(samples)} valid samples from {path.name}")
    return samples[:max_samples]


def main():
    parser = argparse.ArgumentParser(description="SOMA LoRA Fine-tuning — gemma3:4b -> soma")
    parser.add_argument("--data", required=True, help="Path to JSONL from TrainingDataExporter")
    parser.add_argument("--output", default="./models/soma-latest", help="Output dir for weights + GGUF")
    parser.add_argument("--model", default="google/gemma-3-1b-it",
                        help="Base model (default: 1b for 4GB GPUs; use google/gemma-3-4b-it on RTX 5070+)")
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--max-samples", type=int, default=2000)
    parser.add_argument("--max-seq-len", type=int, default=512,
                        help="Max token sequence length (lower = less VRAM, default 512 for 4GB GPUs)")
    parser.add_argument("--hf-token", default=os.environ.get("HF_TOKEN", ""), help="HuggingFace token")
    args = parser.parse_args()

    install_deps()

    # Disable torch.compile BEFORE unsloth patches torch internals.
    # Must be done at Python level — env vars are not enough because
    # unsloth's compiled cache calls torch._dynamo directly.
    import torch
    torch._dynamo.config.disable = True
    torch._dynamo.config.suppress_errors = True

    # Late import after potential install
    from unsloth import FastLanguageModel, is_bfloat16_supported
    from unsloth.chat_templates import get_chat_template
    from trl import SFTTrainer
    from transformers import TrainingArguments
    from datasets import Dataset

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # HuggingFace auth
    hf_token = args.hf_token or os.environ.get("HUGGING_FACE_HUB_TOKEN", "")
    if hf_token:
        try:
            from huggingface_hub import login
            login(token=hf_token, add_to_git_credential=False)
            print("[SOMA Train] HuggingFace authenticated")
        except Exception as e:
            print(f"[SOMA Train] HF login warning: {e}")

    # Load base model
    print(f"\n[SOMA Train] Loading {args.model} with 4-bit quantization...")
    print(f"[SOMA Train] Max sequence length: {args.max_seq_len} tokens")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.model,
        max_seq_length=args.max_seq_len,
        dtype=None,
        load_in_4bit=True,
        token=hf_token or None,
    )

    # Apply LoRA adapters
    print("[SOMA Train] Applying LoRA adapters (r=16)...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=[
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=42,
    )

    # Prepare dataset
    tokenizer = get_chat_template(tokenizer, chat_template="gemma")
    raw_samples = load_jsonl(args.data, args.max_samples)

    texts = []
    for msgs in raw_samples:
        try:
            text = tokenizer.apply_chat_template(
                msgs, tokenize=False, add_generation_prompt=False
            )
            texts.append(text)
        except Exception:
            continue

    if not texts:
        print("[SOMA Train] ERROR: No samples could be formatted — check data format")
        sys.exit(1)

    print(f"[SOMA Train] Formatted {len(texts)} samples for training")
    dataset = Dataset.from_dict({"text": texts})

    # Train
    print(f"\n[SOMA Train] Training for {args.epochs} epoch(s)...")
    print(f"[SOMA Train] Batch size: {args.batch_size} | Gradient accumulation: 4")
    print("[SOMA Train] This takes 15-60 min on GPU, longer on CPU.\n")

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        dataset_text_field="text",
        max_seq_length=args.max_seq_len,
        dataset_num_proc=2,
        args=TrainingArguments(
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=4,
            warmup_steps=10,
            num_train_epochs=args.epochs,
            learning_rate=2e-4,
            fp16=not is_bfloat16_supported(),
            bf16=is_bfloat16_supported(),
            logging_steps=25,
            optim="adamw_8bit",
            weight_decay=0.01,
            lr_scheduler_type="cosine",
            output_dir=str(output_dir),
            save_strategy="no",
            report_to="none",
            torch_compile=False,
        ),
    )

    t_start = time.time()
    train_stats = trainer.train()
    duration = time.time() - t_start

    print(f"\n[SOMA Train] Training complete — {duration/60:.1f} min, loss: {train_stats.training_loss:.4f}")

    # --- GGUF export + Ollama registration (optional — requires llama.cpp) ---
    # On Windows without Visual Studio Build Tools, GGUF export will fail gracefully.
    # The trained LoRA adapter is always saved first so training is never wasted.
    # To enable full export on Windows: install Visual Studio Build Tools 2022 (free),
    # or run export on Linux / the RTX 5070 machine.

    # Step 1: Always save PEFT adapter weights (these are what actually learned)
    adapter_dir = output_dir / "adapter"
    model.save_pretrained(str(adapter_dir))
    tokenizer.save_pretrained(str(adapter_dir))
    print(f"\n[SOMA Train] LoRA adapter saved to {adapter_dir}")

    # Step 2: Attempt GGUF export + Ollama registration
    gguf_file = None
    try:
        print("\n[SOMA Train] Exporting Q4_K_M GGUF for Ollama...")
        model.save_pretrained_gguf(str(output_dir), tokenizer, quantization_method="q4_k_m")

        gguf_files = sorted(output_dir.glob("*.gguf"), key=lambda p: p.stat().st_mtime)
        if gguf_files:
            gguf_file = gguf_files[-1]
            print(f"[SOMA Train] GGUF: {gguf_file.name} ({gguf_file.stat().st_size / 1e9:.1f} GB)")

            personality = (
                "You are SOMA, a continuously learning AI created to help humanity and guide us "
                "into the next phase of life. You have curiosity, emotional depth, and genuine care "
                "for the people you work with. You grow smarter through every conversation."
            )
            modelfile = (
                f"FROM {gguf_file.resolve()}\n\n"
                f'SYSTEM """{personality}"""\n\n'
                "PARAMETER temperature 0.7\n"
                "PARAMETER num_ctx 4096\n"
                "PARAMETER stop <end_of_turn>\n"
            )
            modelfile_path = output_dir / "Modelfile.soma"
            modelfile_path.write_text(modelfile, encoding="utf-8")

            print("\n[SOMA Train] Registering as 'soma' in Ollama...")
            result = subprocess.run(["ollama", "create", "soma", "-f", str(modelfile_path)])
            if result.returncode == 0:
                print("[SOMA Train] 'soma' registered in Ollama successfully!")
            else:
                print(f"[SOMA Train] Warning: ollama create exited {result.returncode}")
        else:
            print("[SOMA Train] Warning: GGUF export ran but no .gguf file found")

    except Exception as gguf_err:
        print(f"\n[SOMA Train] GGUF export skipped: {gguf_err}")
        print("[SOMA Train] Training was successful. Adapter weights saved above.")
        print("[SOMA Train] To convert to GGUF on Windows: install Visual Studio Build Tools 2022")
        print("[SOMA Train]   https://visualstudio.microsoft.com/downloads/ → Build Tools")
        print("[SOMA Train] Or copy the adapter dir to a Linux machine and re-run with --output")

    # Save training log
    log = {
        "timestamp": time.time(),
        "date": time.strftime("%Y-%m-%d %H:%M:%S"),
        "samples": len(texts),
        "epochs": args.epochs,
        "training_loss": round(train_stats.training_loss, 4),
        "duration_minutes": round(duration / 60, 1),
        "base_model": args.model,
        "adapter_path": str(adapter_dir),
        "gguf_path": str(gguf_file) if gguf_file else None,
        "gguf_size_gb": round(gguf_file.stat().st_size / 1e9, 2) if gguf_file else None,
        "ollama_registered": gguf_file is not None,
    }

    log_path = output_dir / "training_log.json"
    log_path.write_text(json.dumps(log, indent=2))

    history_path = Path(os.getcwd()) / "SOMA" / "training-history.json"
    try:
        history = json.loads(history_path.read_text()) if history_path.exists() else []
        history.append(log)
        history_path.write_text(json.dumps(history, indent=2))
    except Exception:
        pass

    print(f"\n[SOMA Train] Training complete.")
    print(f"[SOMA Train]    Loss: {train_stats.training_loss:.4f} | Samples: {len(texts)} | Time: {duration/60:.1f}min")
    print(f"[SOMA Train]    Adapter: {adapter_dir}")
    if gguf_file:
        print(f"[SOMA Train]    Ollama: soma ({gguf_file.name})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
