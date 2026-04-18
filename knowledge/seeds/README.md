# Knowledge Library — Seed Training Data

This directory contains hand-crafted seed training examples for each of SOMA's
four cognitive lobes. These are the **foundation dataset** for the first LoRA
fine-tuning run on each lobe.

## Files

| File | Lobe | Examples | Purpose |
|------|------|----------|---------|
| `logos-seed.jsonl` | LOGOS | 15 | Engineering, code, architecture, debugging |
| `aurora-seed.jsonl` | AURORA | 15 | Voice, emotion, presence, creativity |
| `prometheus-seed.jsonl` | PROMETHEUS | 15 | Strategy, decisions, consequences, goals |
| `thalamus-seed.jsonl` | THALAMUS | 15 | Security, risk, anomaly detection, threat modeling |

Each file is JSONL (one JSON per line) in Ollama chat format:
```json
{"messages": [
  {"role": "system", "content": "[lobe identity prompt]"},
  {"role": "user", "content": "[question]"},
  {"role": "assistant", "content": "[ideal lobe response]"}
]}
```

---

## ⚠️ Requirements for Training

Training SOMA's lobe models requires a **local language model** running via Ollama.

### Step 1: Install Ollama
```
https://ollama.com/download
```

### Step 2: Pull a base model
SOMA defaults to Gemma 3 1B (fits in 4GB VRAM):
```bash
ollama pull google/gemma-3-1b-it
```

For better quality (needs 8GB+ VRAM):
```bash
ollama pull google/gemma-3-4b-it
```

For best quality (needs 16GB+ VRAM):
```bash
ollama pull llama3.2:3b
```

Update `OLLAMA_MODEL` in `config/api-keys.env` to match your pull.

### Step 3: Install training dependencies
```bash
pip install unsloth transformers datasets torch
```

Or use the SOMA training environment:
```bash
python -m venv .soma_venv
.soma_venv/Scripts/activate   # Windows
pip install -r requirements-training.txt
```

---

## ⚠️ Per-User Seed Regeneration

**The seed files in this directory are SOMA's default seeds.**
They contain generic examples using "the user" as the human partner.

When SOMA is deployed for a specific user, these seeds should be regenerated
to reflect that user's domain, communication style, and working context.
SOMA can generate personalized seeds after accumulating enough conversation
history via:

```
POST /api/soma/knowledge/generate-seeds
Body: { "lobe": "aurora", "conversationSample": 50 }
```

This uses KnowledgeCuratorArbiter + the existing brain to generate seeds
that sound like *this specific SOMA* working with *this specific user*.
The generic seeds serve as a starting point. The personalized seeds are
what make SOMA genuinely different for each user.

---

## Training Timeline

| Stage | Condition | What happens |
|-------|-----------|-------------|
| **Seeding** | Manual / migration script | Seed files loaded into knowledge library |
| **Auto-accumulation** | SOMA running | KnowledgeCuratorArbiter files signals → lobe directories |
| **Threshold** | 100 entries in a lobe | OllamaAutoTrainer starts autonomous LoRA training |
| **NEMESIS eval** | Training complete | A/B eval against baseline — must win 4/5 prompts |
| **Promotion** | NEMESIS approves | QuadBrain routes that lobe to the specialist model |
| **Logging** | Always | Decision written to `knowledge/thalamus/` |
