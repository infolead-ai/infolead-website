---
name: claude-mem
description: Manage persistent project memory across Claude Code sessions using PROJECT_LOG.md and structured memory files. Use this skill when you need to remember decisions, record progress, recall why something was built a certain way, log completed milestones, or pick up where a previous session left off. Triggers: "remember this", "log that we decided", "what did we do last time", "update the project log", "why did we build X this way", "add a note", "record this decision", "what's our current status", "catch me up on the project".
---

# Claude-mem: Persistent Project Memory

Claude Code sessions are stateless — each session starts fresh. This skill turns `PROJECT_LOG.md` and structured memory files into a persistent "brain" for the project.

## Memory Architecture

```
project-root/
├── CLAUDE.md              ← Claude Code governance (always read)
├── PROJECT_LOG.md         ← Chronological decision + milestone log
└── .claude/
    ├── decisions.md       ← Key architectural decisions (ADRs)
    ├── status.md          ← Current sprint / what's in progress
    └── context.md         ← Background context (business, stack, team)
```

## Core Operations

### 1. Log a Decision
When the user makes a significant decision (architecture, product, business):

```markdown
<!-- Append to PROJECT_LOG.md -->
## [YYYY-MM-DD] Decision: <title>
**Context**: Why this came up
**Decision**: What was decided
**Rationale**: Why this option over alternatives
**Impact**: What this affects going forward
---
```

### 2. Log a Milestone
When a feature ships or a task completes:

```markdown
## [YYYY-MM-DD] ✅ Milestone: <title>
- What was built/completed
- Key files changed: `path/to/file.ts`
- Next step:
---
```

### 3. Log a Blocker / Open Question
```markdown
## [YYYY-MM-DD] ⚠️ Blocker: <title>
- Problem: 
- Tried: 
- Status: OPEN / RESOLVED
---
```

### 4. Session Start Recap
At the **start of a new session**, always:
```bash
# Read the last 50 lines of project log
tail -n 80 PROJECT_LOG.md

# Read current status
cat .claude/status.md
```
Then summarize to the user: "Here's where we left off..."

### 5. Update Status File
After completing tasks, update `.claude/status.md`:
```markdown
# Current Status — [date]

## In Progress
- [ ] Task being worked on

## Completed This Week
- [x] Thing that shipped

## Next Up
- Thing to do next

## Open Questions
- Unresolved decision
```

## When to Trigger

| User says | Action |
|---|---|
| "remember that we decided X" | Append to PROJECT_LOG.md as Decision |
| "log that we shipped X" | Append as Milestone |
| "what did we decide about X" | Search PROJECT_LOG.md, decisions.md |
| "catch me up" / session start | Read tail of log + status.md |
| "why did we do X this way" | Search decisions.md |
| "what's left to do" | Read status.md |

## InfoLead-Specific Memory Entries to Maintain

Key decisions already made (pre-populate into `decisions.md`):
- **Tech stack**: Astro + TypeScript + Tailwind, /en/ /zh/ physical routes
- **Repo**: `infolead-ai/infolead-website` on GitHub
- **Deploy**: Vercel auto-deploy from main branch
- **DNS**: Cloudflare (infolead.ca), email routing dev@infolead.ca
- **Brand colors**: neon cyan #00E5FF (Castor), soft purple #A78BFA (Lyra)
- **Video**: Cloudflare Stream HLS (d16e68b2fbfeb0c080a1c55757b0b2da)
- **Business model**: SaaS $1,500 CAD setup + $499/month
- **First client**: Aplus Sport Club (pending Twilio re-registration)

## Bash Helpers

```bash
# Quick log entry
echo -e "\n## [$(date +%Y-%m-%d)] \n" >> PROJECT_LOG.md

# Search decisions
grep -n "Decision:" PROJECT_LOG.md | tail -20

# Check last session
tail -60 PROJECT_LOG.md
```
