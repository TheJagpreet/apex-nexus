---
name: git-commit
description: Stage changed files, write a conventional commit message (title + body), and push to origin. Refuses to commit .env or secrets.
---

# Git Commit & Push

Stage, commit with a well-formed message, and push the current branch to origin.

## Usage

```
/git-commit
/git-commit <optional hint about what changed>
```

## Behavior

### 1. Inspect current state

Run these in parallel:

```bash
git status --short
git diff HEAD
git log --oneline -5
```

- Identify all modified, added, and deleted files.
- Read recent commits to learn the project's commit message style.

### 2. Safety checks — abort if any are true

| Check | Reason |
|-------|--------|
| `.env` file in staged/unstaged changes | Never commit secrets |
| `.venv/`, `node_modules/`, `dist/` in changes | Build artefacts — add to .gitignore instead |
| Merge conflict markers (`<<<<<<<`) in any file | Resolve conflicts first |
| No changes at all | Nothing to commit |

If a safety check fires, report clearly and stop — do not commit.

### 3. Stage files

Prefer explicit paths over `git add .`:

```bash
git add <file1> <file2> ...   # stage only the relevant files
```

Never stage: `*.env`, `*.db`, `*.sqlite*`, `.venv/`, `node_modules/`, `dist/`, `*.pyc`.

### 4. Write the commit message

Follow **Conventional Commits** (`type(scope): subject`):

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Restructuring without behaviour change |
| `chore` | Tooling, deps, config, CI |
| `docs` | Documentation only |
| `test` | Tests only |
| `style` | Formatting, whitespace |
| `perf` | Performance improvement |

**Scope** (optional) — the service or area affected:
`rag`, `identity`, `gateway`, `agents`, `portal`, `scripts`, `makefile`, `docker`, `deps`

**Subject line rules:**
- Imperative mood, present tense ("Add", "Fix", not "Added" / "Fixes")
- ≤ 72 characters
- No trailing period

**Body rules (include when the diff needs explanation):**
- Blank line after subject
- Wrap at 100 characters
- Explain *what* changed and *why*, not how
- List notable sub-changes as bullet points if there are more than two

**Example:**

```
feat(agents): add -Service param to dev.ps1 for single-service starts

Single-service mode runs the process inline (no job overhead) so output
goes straight to the console. All-services mode continues to use
background jobs with a polling loop.

- Updated dev.ps1 with [ValidateSet] param and inline vs job branching
- Updated test-all.ps1 and lint.ps1 with matching -Service params
```

### 5. Commit

```bash
git commit -m "$(cat <<'EOF'
<subject line>

<body — omit if subject is self-explanatory>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 6. Push

```bash
git push
```

If the branch has no upstream yet:

```bash
git push -u origin <branch>
```

### 7. Report

Print the commit hash, subject, and the push URL. Example:

```
Committed: a1b2c3d  feat(scripts): add lint.ps1 for Windows parity
Pushed to: origin/master
```

## Edge cases

- **Untracked files only** — stage them explicitly; don't use `git add -A` blindly.
- **Partially staged files** — commit only what's staged; report what's left unstaged.
- **Detached HEAD** — warn the user and do not push.
- **Protected branch** (`main`/`master` with push protection) — warn before pushing.
- **Nothing to push** (already up to date) — report and stop cleanly.
