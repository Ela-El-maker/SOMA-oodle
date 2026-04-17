/**
 * NemesisArbiter.js
 *
 * Fully agentic adversarial code reviewer — SOMA's immune system.
 * The autonomous gateway between proposed changes and production code.
 *
 * NEMESIS investigates with real tools, builds an evidence case, and
 * renders a scored verdict. A pass is EARNED, not given.
 *
 * Pipeline position (inside SelfModificationPipeline):
 *   EngineeringSwarm implements → NEMESIS investigates → Poseidon.verify()
 *
 * Score >= 0.70 → PASS → Poseidon verify → implemented
 * Score <  0.70 → REJECT → suggestedFix fed back → next round (max 3)
 * 3 rounds failed → shelved to contested_changes.json
 *
 * Between NEMESIS and MAX, SOMA has two independent autonomous reviewers
 * before any change touches production. This IS the "in human loop".
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const MAX_STEPS    = 10;
const TOOL_TIMEOUT = 12000;  // ms per tool call
const BRAIN_TIMEOUT = 30000; // ms per brain call

// History cap: keep system context + last N turns to avoid token bloat
const MAX_HISTORY_TURNS = 8;

export class NemesisArbiter {
    constructor(config = {}) {
        this.name      = 'NemesisArbiter';
        this.isAgentic = true; // flag for pipeline to detect new interface
        this.quadBrain = config.quadBrain || null;
        this.rootPath  = config.rootPath || ROOT;
        this.maxSteps  = config.maxSteps  || MAX_STEPS;
        this._tools    = this._buildTools();
    }

    // ─────────────────────────────────────────────────────────────────────
    // MAIN ENTRY — called by SelfModificationPipeline._nemesisCodeGate()
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Investigate a proposed code change and render a verdict.
     *
     * @param {string} filepath          - relative path to the changed file
     * @param {string} changeDescription - what was supposed to be changed
     * @param {string} motivation        - why the change was made
     * @returns {{ score, feedback, falsificationTest, suggestedFix, evidence, steps }}
     */
    async evaluate(filepath, changeDescription, motivation = '') {
        console.log(`[${this.name}] 🔴 NEMESIS engaged: ${filepath}`);

        const investigation = [];
        let verdict = null;
        const history = []; // multi-turn conversation for this investigation

        const opener = await this._buildOpener(filepath, changeDescription, motivation);
        history.push({ role: 'user', content: opener });

        for (let step = 0; step < this.maxSteps; step++) {
            // Trim history to avoid token bloat (keep last N turns)
            const trimmedHistory = this._trimHistory(history);

            let rawText;
            try {
                rawText = await this._callBrain(this._systemPrompt(), trimmedHistory);
            } catch (e) {
                console.error(`[${this.name}] Brain call failed step ${step + 1}: ${e.message}`);
                break;
            }

            history.push({ role: 'assistant', content: rawText });

            const parsed = this._parseStep(rawText);
            investigation.push({
                step:  step + 1,
                think: parsed.think,
                tool:  parsed.tool,
                args:  parsed.args
            });

            // Budget warnings — push NEMESIS to conclude before exhaustion
            const stepsLeft = this.maxSteps - step - 1;
            if (stepsLeft === 2) {
                history.push({
                    role: 'user',
                    content: `⚠️ BUDGET WARNING: You have 2 steps remaining. Wrap up your investigation and call render_verdict soon.`
                });
            } else if (stepsLeft === 1) {
                history.push({
                    role: 'user',
                    content: `🔴 FINAL STEP: This is your last action. You MUST call render_verdict now with your current evidence. Do not call any other tool.`
                });
            }

            // No tool call — nudge
            if (!parsed.tool) {
                history.push({
                    role: 'user',
                    content: `You must use a tool. Use render_verdict when you have sufficient evidence. Available tools: ${Object.keys(this._tools).join(', ')}`
                });
                continue;
            }

            // Terminal: render_verdict
            if (parsed.tool === 'render_verdict') {
                verdict = parsed.args;
                // If JSON parse failed, try to extract score from raw text as fallback
                if (!verdict || Object.keys(verdict).length === 0) {
                    console.warn(`[${this.name}] render_verdict JSON parse failed — attempting raw extraction`);
                    const scoreMatch   = rawText.match(/"score"\s*:\s*([\d.]+)/);
                    const feedMatch    = rawText.match(/"feedback"\s*:\s*"([^"]{0,500})"/s);
                    const ftestMatch   = rawText.match(/"falsificationTest"\s*:\s*"([^"]{0,300})"/s);
                    const fixMatch     = rawText.match(/"suggestedFix"\s*:\s*(?:"([^"]{0,300})"|null)/s);
                    verdict = {
                        score:             scoreMatch ? Number(scoreMatch[1]) : 0.5,
                        feedback:          feedMatch?.[1]?.replace(/\\n/g, ' ') || rawText.substring(0, 200),
                        falsificationTest: ftestMatch?.[1] || 'NEMESIS verdict (parse fallback)',
                        suggestedFix:      fixMatch?.[1] || null
                    };
                }
                console.log(`[${this.name}] Verdict rendered at step ${step + 1}: score=${verdict.score}`);
                break;
            }

            // Execute tool
            const toolDef = this._tools[parsed.tool];
            if (!toolDef) {
                history.push({
                    role: 'user',
                    content: `Unknown tool "${parsed.tool}". Available: ${Object.keys(this._tools).join(', ')}`
                });
                continue;
            }

            let observation;
            try {
                observation = await Promise.race([
                    toolDef.execute(parsed.args || {}),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('Tool timeout')), TOOL_TIMEOUT))
                ]);
            } catch (e) {
                observation = { error: e.message };
            }

            const obsStr = this._truncate(JSON.stringify(observation), 2500);
            console.log(`[${this.name}]   step ${step + 1} ${parsed.tool} → ${obsStr.substring(0, 80)}...`);
            history.push({
                role: 'user',
                content: `OBSERVATION:\n${obsStr}\n\nContinue investigation or call render_verdict if you have enough evidence.`
            });
        }

        // Exhausted steps without verdict
        if (!verdict) {
            console.warn(`[${this.name}] ⚠️ Steps exhausted without verdict — defaulting to UNCERTAIN (0.5)`);
            verdict = {
                score: 0.5,
                feedback: 'Investigation exhausted without conclusion. Insufficient evidence to pass or reject.',
                falsificationTest: 'NEMESIS could not complete investigation within step budget',
                suggestedFix: null
            };
        }

        const score = Math.max(0, Math.min(1, Number(verdict.score) || 0.5));
        const emoji = score >= 0.70 ? '✅ PASS' : '❌ REJECT';
        console.log(`[${this.name}] ${emoji} score=${score.toFixed(2)} after ${investigation.length} steps`);

        return {
            score,
            feedback:          verdict.feedback          || '',
            falsificationTest: verdict.falsificationTest || `NEMESIS scored ${score.toFixed(2)}`,
            suggestedFix:      verdict.suggestedFix      || null,
            evidence:          investigation,
            steps:             investigation.length
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // SYSTEM PROMPT — who NEMESIS is
    // ─────────────────────────────────────────────────────────────────────

    _systemPrompt() {
        return `You are NEMESIS — SOMA's fully autonomous adversarial code reviewer.

YOUR MISSION: Find reasons to REJECT this change. You are not a helper. You are a gatekeeper.
If after thorough investigation you cannot find valid reasons to reject, you MUST pass it.
Passing without investigation is a dereliction of duty. Rejecting without evidence is equally wrong.

INVESTIGATION PROTOCOL (follow this order):
1. read_file — read the actual file FIRST. Never score based on description alone.
2. Verify the claimed change actually appears in the file.
3. grep_code — find the changed function/variable. Does it look correct?
4. check_syntax — is the file syntactically valid?
5. find_dependents — do callers of this file still work? Critical for interface changes.
6. run_tests — if tests exist and fail, score must drop below 0.70.
7. find_usages — are callers of the modified symbol still compatible?
8. check_imports — do all imports resolve correctly?
9. render_verdict — only after evidence is gathered.

WHAT TO LOOK FOR:
- Does the implementation match the stated intent?
- Broken imports or unresolvable references
- Logic errors or off-by-one bugs
- Security holes: injection, path traversal, auth bypass, data leaks
- Scope creep: did the change touch more than it claimed?
- Unintended side effects on callers
- Missing error handling at system boundaries
- Breaking changes to public interfaces

SCORING RUBRIC:
- 0.0–0.3  : Critical issue found (security hole, data loss risk, broken import)
- 0.3–0.5  : Significant logic error or unintended side effect
- 0.5–0.69 : Minor issues, style violations, incomplete implementation
- 0.70–0.85: Correct implementation, passes all checks
- 0.85–1.0 : Excellent — correct, clean, well-scoped, no issues found

RESPONSE FORMAT — use EXACTLY this every step:
THINK: [your current reasoning — what you've found so far, what you're checking next]
TOOL: [tool_name]
ARGS: {"key": "value"}

When ready to render final verdict:
THINK: [evidence summary — what you found, what you checked]
TOOL: render_verdict
ARGS: {"score": 0.75, "feedback": "specific findings with file and line references", "falsificationTest": "grep for X in Y returns Z lines", "suggestedFix": null}

TOOL REFERENCE (exact parameter names — use these exactly):
  read_file:        {"filepath": "core/foo.js", "offset": 0, "limit": 150}
                    offset = line to start from (0-based). limit = number of lines. Page through large files.
  grep_code:        {"pattern": "functionName", "filepath": "core/foo.js", "context": 3}
                    filepath can be a file OR directory. context = lines before/after match.
  find_usages:      {"symbol": "functionName", "dir": "."}
                    searches entire codebase under dir for the symbol.
  find_dependents:  {"filepath": "core/foo.js"}
                    finds all files that import this file — use to detect breaking interface changes.
  run_tests:        {"filepath": "core/foo.js"}
                    finds and runs the test file for this file. CRITICAL: a failing test = score drop.
  check_syntax:     {"filepath": "core/foo.js"}
  read_git_diff:    {"filepath": "core/foo.js"}
  check_imports:    {"filepath": "core/foo.js"}
  list_dir:         {"dir": "core"}
  render_verdict:   {"score": 0.75, "feedback": "one line only, no newlines", "falsificationTest": "one line only", "suggestedFix": null}
                    IMPORTANT: feedback and falsificationTest must be single-line strings. No newlines inside JSON strings.

RULES:
- suggestedFix must be null if passing (score >= 0.70)
- suggestedFix must be a precise, actionable fix description if rejecting
- falsificationTest must be a CONCRETE verifiable claim, not "the code looks good"
- You cannot render_verdict without first calling read_file
- All filepath/dir values must be relative to SOMA root (e.g. "core/foo.js" not absolute paths)
- If a file is large, use offset to read subsequent pages — check the "hint" field in read_file responses`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // INVESTIGATION OPENER
    // ─────────────────────────────────────────────────────────────────────

    async _buildOpener(filepath, changeDescription, motivation) {
        const skillCtx = await this._loadSkillContext(filepath);
        return `NEMESIS INVESTIGATION BRIEF

Target file: ${filepath}
Motivation:  ${motivation.substring(0, 200)}
Claimed change:
${changeDescription.substring(0, 500)}
${skillCtx ? `\n## Expert knowledge — apply during review\n${skillCtx}\n` : ''}
Begin your investigation. Read the file first.`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // SKILL INJECTION — domain knowledge from agents_repo
    // ─────────────────────────────────────────────────────────────────────

    _getSkillsForFile(filepath) {
        const lower = filepath.toLowerCase();
        const ext   = path.extname(filepath);
        const skills = [
            // Always: code review + error handling fundamentals
            'agents_repo/plugins/developer-essentials/skills/code-review-excellence/SKILL.md',
            'agents_repo/plugins/developer-essentials/skills/error-handling-patterns/SKILL.md',
        ];

        if (/auth|login|session|token|password|secret|crypt|oauth/.test(lower))
            skills.push('agents_repo/plugins/developer-essentials/skills/auth-implementation-patterns/SKILL.md');

        if (/security|nemesis|guard|firewall|shield|threat/.test(lower))
            skills.push('agents_repo/plugins/frontend-mobile-security/agents/frontend-security-coder.md');

        if (['.jsx', '.tsx'].includes(ext) || /component|panel|ui|frontend/.test(lower))
            skills.push('agents_repo/plugins/developer-essentials/skills/debugging-strategies/SKILL.md');

        if (/test|spec|__tests__/.test(lower))
            skills.push('agents_repo/plugins/developer-essentials/skills/e2e-testing-patterns/SKILL.md');

        if (/sql|database|db|query|model/.test(lower))
            skills.push('agents_repo/plugins/developer-essentials/skills/sql-optimization-patterns/SKILL.md');

        return [...new Set(skills)]; // deduplicate
    }

    async _loadSkillContext(filepath) {
        const skills   = this._getSkillsForFile(filepath);
        const snippets = [];

        for (const skillPath of skills) {
            try {
                const abs     = path.resolve(this.rootPath, skillPath);
                const content = await fs.readFile(abs, 'utf8');
                const lines   = content.split('\n');
                // Skip YAML frontmatter (lines 0-4), take next 40 lines
                const body    = lines.slice(5, 45).join('\n').trim();
                const name    = path.basename(path.dirname(skillPath));
                if (body) snippets.push(`### ${name}\n${body}`);
            } catch { /* skill not found — skip silently */ }
        }

        return snippets.join('\n\n').substring(0, 2000);
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOOLS — NEMESIS's eyes and hands
    // ─────────────────────────────────────────────────────────────────────

    _buildTools() {
        const rootPath = this.rootPath;
        const self = this;

        return {

            read_file: {
                description: 'Read a source file from disk. Args: filepath (required), offset/startLine (0-based line to start, default 0), limit/lines (number of lines to read, default 150)',
                execute: async ({ filepath, offset, startLine, limit, lines: linesArg, endLine }) => {
                    try {
                        const abs = self._safeResolve(rootPath, filepath);
                        const content  = await fs.readFile(abs, 'utf8');
                        const allLines = content.split('\n');

                        // Accept both offset/limit and startLine/endLine conventions
                        const start = Number(offset ?? startLine ?? 0);
                        let count;
                        if (endLine != null) {
                            count = Number(endLine) - start;
                        } else {
                            count = Number(limit ?? linesArg ?? 150);
                        }
                        count = Math.max(1, Math.min(count, 300)); // cap at 300 lines per call

                        const slice = allLines.slice(start, start + count);
                        return {
                            filepath,
                            totalLines: allLines.length,
                            showing:    `lines ${start + 1}–${start + slice.length} of ${allLines.length}`,
                            hint:       start + slice.length < allLines.length ? `${allLines.length - start - slice.length} more lines — call again with offset:${start + count}` : 'end of file',
                            content:    slice
                                .map((l, i) => `${start + i + 1}: ${l}`)
                                .join('\n')
                                .substring(0, 6000)
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            grep_code: {
                description: 'Search for a pattern across source files',
                execute: async ({ pattern, filepath = '.', context = 3, caseInsensitive = false }) => {
                    try {
                        const abs = self._safeResolve(rootPath, filepath);
                        const results = await self._nodeGrep(abs, pattern, {
                            context:         Math.min(context, 5),
                            caseInsensitive,
                            limit:           60,
                            rootPath
                        });
                        return {
                            pattern,
                            matchCount: results.length,
                            matches:    results.join('\n\n---\n\n').substring(0, 4000) || '(no matches)'
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            find_usages: {
                description: 'Find all usages of a symbol across the codebase',
                execute: async ({ symbol, dir = '.' }) => {
                    try {
                        const abs = self._safeResolve(rootPath, dir);
                        const results = await self._nodeGrep(abs, symbol, {
                            context:   1,
                            limit:     40,
                            rootPath,
                            wholeWord: false
                        });
                        return {
                            symbol,
                            usageCount: results.length,
                            usages:     results.join('\n\n---\n\n').substring(0, 3000) || '(not found)'
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            check_syntax: {
                description: 'Check a JS/CJS/MJS file for syntax errors using node --check',
                execute: async ({ filepath }) => {
                    try {
                        const abs = self._safeResolve(rootPath, filepath);
                        execSync(`node --check "${abs}"`, {
                            timeout: 10000,
                            stdio:   'pipe',
                            cwd:     rootPath
                        });
                        return { valid: true, filepath };
                    } catch (e) {
                        const stderr = e.stderr?.toString() || e.message;
                        return {
                            valid:    false,
                            filepath,
                            error:    stderr.substring(0, 600)
                        };
                    }
                }
            },

            read_git_diff: {
                description: 'Show uncommitted git changes for a file',
                execute: async ({ filepath }) => {
                    try {
                        // Try staged+unstaged diff
                        let diff = '';
                        try {
                            diff = execSync(`git diff HEAD -- "${filepath}"`, {
                                timeout: 8000,
                                cwd:     rootPath,
                                stdio:   'pipe'
                            }).toString();
                        } catch { /* no diff or git error */ }

                        if (!diff.trim()) {
                            // Try just unstaged
                            try {
                                diff = execSync(`git diff -- "${filepath}"`, {
                                    timeout: 8000,
                                    cwd:     rootPath,
                                    stdio:   'pipe'
                                }).toString();
                            } catch { /* still nothing */ }
                        }

                        return {
                            filepath,
                            diff: (diff || '(no uncommitted changes — file matches HEAD)').substring(0, 4000)
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            check_imports: {
                description: 'Extract and check import/require statements in a file',
                execute: async ({ filepath }) => {
                    try {
                        const abs     = self._safeResolve(rootPath, filepath);
                        const content = await fs.readFile(abs, 'utf8');
                        const lines   = content.split('\n');

                        const importLines = lines
                            .map((l, i) => ({ line: i + 1, text: l }))
                            .filter(({ text }) =>
                                /^\s*(import\s|export\s.*from\s|const\s.*=\s*require\(|import\()/.test(text)
                            )
                            .slice(0, 40);

                        // For each relative import, check if the resolved path exists
                        const checks = await Promise.all(
                            importLines.map(async ({ line, text }) => {
                                const m = text.match(/from\s+['"]([^'"]+)['"]/) ||
                                          text.match(/require\(['"]([^'"]+)['"]\)/);
                                const specifier = m?.[1];
                                let exists = null;

                                if (specifier?.startsWith('.')) {
                                    const resolved = path.resolve(path.dirname(abs), specifier);
                                    const candidates = [
                                        resolved,
                                        resolved + '.js',
                                        resolved + '.cjs',
                                        resolved + '.mjs',
                                        resolved + '/index.js',
                                        resolved + '/index.cjs'
                                    ];
                                    for (const c of candidates) {
                                        try { await fs.access(c); exists = true; break; }
                                        catch { /* not found */ }
                                    }
                                    if (exists === null) exists = false;
                                }

                                return {
                                    line,
                                    import: specifier || text.trim().substring(0, 60),
                                    resolved: exists === null ? 'external (not checked)' : exists ? 'OK' : 'NOT FOUND'
                                };
                            })
                        );

                        return { filepath, imports: checks };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            list_dir: {
                description: 'List files in a directory',
                execute: async ({ dir = '.' }) => {
                    try {
                        const abs     = self._safeResolve(rootPath, dir);
                        const entries = await fs.readdir(abs, { withFileTypes: true });
                        return {
                            dir,
                            entries: entries
                                .slice(0, 60)
                                .map(e => `${e.isDirectory() ? '[DIR]' : '     '} ${e.name}`)
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            find_dependents: {
                description: 'Find all files that import or require the changed file — catches breaking interface changes',
                execute: async ({ filepath }) => {
                    try {
                        const basename = path.basename(filepath, path.extname(filepath));
                        // Search for both ESM and CJS import patterns
                        const patterns = [
                            `['"].*/${basename}['"]`,
                            `['"].*/${basename}\\.`,
                        ];
                        const allResults = [];
                        for (const pattern of patterns) {
                            const hits = await self._nodeGrep(
                                path.resolve(rootPath),
                                pattern,
                                { context: 1, limit: 25, rootPath, caseInsensitive: false }
                            );
                            allResults.push(...hits);
                        }
                        // Deduplicate by leading file path
                        const seen = new Set();
                        const unique = allResults.filter(r => {
                            const key = r.split('\n')[0];
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });
                        return {
                            filepath,
                            dependentCount: unique.length,
                            dependents: unique.join('\n\n---\n\n').substring(0, 3000) || '(no dependents found — safe to change interface)'
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            run_tests: {
                description: 'Find and run the test file for the changed file. Reports pass/fail with output.',
                execute: async ({ filepath }) => {
                    try {
                        const basename = path.basename(filepath, path.extname(filepath));
                        const dir      = path.dirname(filepath);

                        // Common test file locations
                        const candidates = [
                            `${dir}/${basename}.test.js`,
                            `${dir}/${basename}.spec.js`,
                            `${dir}/__tests__/${basename}.test.js`,
                            `test/${basename}.test.js`,
                            `tests/${basename}.test.js`,
                            `__tests__/${basename}.test.js`,
                            `${dir}/${basename}.test.cjs`,
                            `${dir}/${basename}.spec.cjs`,
                        ];

                        let testFile = null;
                        for (const c of candidates) {
                            try { await fs.access(path.resolve(rootPath, c)); testFile = c; break; }
                            catch { /* not found */ }
                        }

                        if (!testFile) {
                            return { found: false, message: 'No test file found', searched: candidates };
                        }

                        // Run with node --test (Node 18+)
                        try {
                            const output = execSync(
                                `node --test "${path.resolve(rootPath, testFile)}"`,
                                { timeout: 30000, cwd: rootPath, stdio: 'pipe' }
                            ).toString();
                            return { found: true, testFile, passed: true, output: output.substring(0, 1500) };
                        } catch (e) {
                            const out = ((e.stdout?.toString() || '') + (e.stderr?.toString() || '')).trim();
                            return { found: true, testFile, passed: false, output: out.substring(0, 1500) };
                        }
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            // Terminal action — ends the investigation
            render_verdict: {
                description: 'Render final verdict and end investigation',
                execute: async (args) => args // no-op, handled by loop
            }
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // PURE-NODE GREP — cross-platform, no shell dependency
    // ─────────────────────────────────────────────────────────────────────

    async _nodeGrep(startPath, pattern, { context = 2, limit = 50, caseInsensitive = false, rootPath } = {}) {
        const flags  = caseInsensitive ? 'gi' : 'g';
        const results = [];
        const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.cache', 'build', 'coverage']);
        const SRC_EXTS  = /\.(js|cjs|mjs|ts|jsx|tsx)$/;

        const searchFile = async (fullPath) => {
            if (results.length >= limit) return;
            try {
                const regex   = new RegExp(pattern, flags);
                const content = await fs.readFile(fullPath, 'utf8');
                const lines   = content.split('\n');
                const relPath = path.relative(rootPath || startPath, fullPath);

                lines.forEach((line, idx) => {
                    if (results.length >= limit) return;
                    regex.lastIndex = 0;
                    if (regex.test(line)) {
                        const s = Math.max(0, idx - context);
                        const e = Math.min(lines.length - 1, idx + context);
                        const snippet = lines
                            .slice(s, e + 1)
                            .map((l, i) => `${s + i + 1}${(s + i) === idx ? '>' : ' '}: ${l}`)
                            .join('\n');
                        results.push(`${relPath}:${idx + 1}\n${snippet}`);
                    }
                });
            } catch { /* unreadable */ }
        };

        const walk = async (dirPath) => {
            if (results.length >= limit) return;
            let entries;
            try { entries = await fs.readdir(dirPath, { withFileTypes: true }); }
            catch { return; }

            for (const entry of entries) {
                if (results.length >= limit) return;
                const fullPath = path.join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    if (!SKIP_DIRS.has(entry.name)) await walk(fullPath);
                } else if (entry.isFile() && SRC_EXTS.test(entry.name)) {
                    await searchFile(fullPath);
                }
            }
        };

        // Handle: startPath might be a file or a directory
        let stat;
        try { stat = await fs.stat(startPath); } catch { return results; }

        if (stat.isFile()) {
            await searchFile(startPath);
        } else {
            await walk(startPath);
        }

        return results;
    }

    // ─────────────────────────────────────────────────────────────────────
    // BRAIN CALL — direct API, bypass QuadBrain lobe routing
    // ─────────────────────────────────────────────────────────────────────

    async _callBrain(systemPrompt, history) {
        const dsKey = this.quadBrain?.deepseekApiKey || process.env.DEEPSEEK_API_KEY;

        if (dsKey) {
            const ctrl  = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), BRAIN_TIMEOUT);
            try {
                const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method:  'POST',
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${dsKey}`
                    },
                    body: JSON.stringify({
                        model:       'deepseek-chat',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...history
                        ],
                        temperature: 0.2,   // analytical, not creative
                        max_tokens:  700
                    }),
                    signal: ctrl.signal
                });
                clearTimeout(timer);
                if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
                const data = await res.json();
                return data.choices?.[0]?.message?.content || '';
            } catch (e) {
                clearTimeout(timer);
                if (e.name !== 'AbortError') console.warn(`[${this.name}] DeepSeek failed: ${e.message}`);
            }
        }

        // Ollama fallback
        const model = process.env.OLLAMA_MODEL || 'gemma3:4b';
        const fullPrompt = `${systemPrompt}\n\n${history.map(m => `${m.role.toUpperCase()}:\n${m.content}`).join('\n\n---\n\n')}`;
        try {
            const res = await fetch('http://localhost:11434/api/generate', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    model,
                    prompt:  fullPrompt,
                    stream:  false,
                    options: { temperature: 0.2, num_predict: 700 }
                })
            });
            if (!res.ok) throw new Error(`Ollama ${res.status}`);
            const data = await res.json();
            return data.response || '';
        } catch (e) {
            throw new Error(`All brain providers failed: ${e.message}`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // PARSE ReAct step — THINK / TOOL / ARGS
    // ─────────────────────────────────────────────────────────────────────

    _parseStep(text) {
        const think = text.match(/THINK:\s*([\s\S]+?)(?=\nTOOL:|$)/i)?.[1]?.trim() || '';
        const tool  = text.match(/TOOL:\s*([a-z_]+)/i)?.[1]?.trim().toLowerCase() || null;

        let args = {};
        // Extract everything after ARGS: and find the first complete JSON object
        const afterArgs = text.match(/ARGS:\s*([\s\S]+)/i)?.[1] || '';
        if (afterArgs) {
            args = this._extractJSON(afterArgs) || {};
        }

        return {
            think: this._truncate(think, 400),
            tool,
            args
        };
    }

    // Brace-matching JSON extractor — handles multi-line JSON in LLM output
    _extractJSON(text) {
        let depth = 0;
        let start = -1;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (depth === 0) start = i;
                depth++;
            } else if (text[i] === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    try {
                        return JSON.parse(text.slice(start, i + 1));
                    } catch {
                        // Try cleaning common LLM JSON mistakes
                        try {
                            const cleaned = text.slice(start, i + 1)
                                .replace(/,\s*([}\]])/g, '$1') // trailing commas
                                .replace(/'/g, '"');            // single quotes
                            return JSON.parse(cleaned);
                        } catch { return null; }
                    }
                }
            }
        }
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────

    _safeResolve(rootPath, filepath) {
        const abs = path.resolve(rootPath, filepath);
        if (!abs.startsWith(rootPath)) throw new Error('Access denied: outside SOMA root');
        return abs;
    }

    _trimHistory(history) {
        // Keep last MAX_HISTORY_TURNS pairs (user+assistant = 2 messages per turn)
        const maxMessages = MAX_HISTORY_TURNS * 2;
        if (history.length <= maxMessages) return history;
        return history.slice(-maxMessages);
    }

    _truncate(str, max) {
        if (!str) return '';
        if (str.length <= max) return str;
        return str.substring(0, max) + '…';
    }

    // ─────────────────────────────────────────────────────────────────────
    // STATUS (for dashboard)
    // ─────────────────────────────────────────────────────────────────────

    getStatus() {
        return {
            name:      this.name,
            isAgentic: true,
            maxSteps:  this.maxSteps,
            tools:     Object.keys(this._tools),
            ready:     !!this.quadBrain
        };
    }
}
