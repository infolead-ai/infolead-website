# Demo Rebuild Plan v3 — Surgical Fix Pass

**Version**: 3.0 FINAL · 4 issues, one /plan session
**Date**: 2026-04-30 morning
**Repo**: `infolead-website` (path: `C:\Users\codey\Projects\infolead\infolead-website\`)
**Owner**: Glen Tang
**Implementation tool**: Claude Code (`/plan` mode mandatory before code)
**Predecessor**: v2.1 brief shipped overnight in 12 commits; this v3 fixes issues found in production smoke test

---

## 0. Scope & Status

✅ Demo architecture is live (chooser + /demo/castor + /demo/lyra)
✅ Castor v2.0 prompt is live (4-iter QA clean)
✅ ElevenLabs Lyra voice is working (image 4 confirms real spectrum + voice playback)

❌ 4 production issues found this morning during real-device smoke test — fix all in one /plan pass.

**This is NOT an architecture change.** Same routes, same components, same prompts. Surgical fixes only.

---

## 1. Locked Decisions

| # | Issue | Decision |
|---|---|---|
| 1 | Castor API broken | Diagnose root cause in /plan, fix in implementation |
| 2 | Card background transparency leak | Add explicit gradient backgrounds to TeamMemberCard |
| 3 | Lyra UX A+B+C | Implement all three (status indicator + mic upgrade + text input demote) |
| 4 | Conversation style | Full terminal log redesign — monospace, no bubbles, colored role labels, click-to-expand |
| 5 | Long-text truncation threshold | Mobile 4 lines, desktop 6 lines, then `[展开 / Expand]` |

---

## 2. Issue 1 — Castor /api/chat broken on production

### Symptom (Glen reported)

User enters `/demo/castor`, types a message, presses send → no response appears in transcript.

### Diagnosis steps (run in /plan, do NOT skip)

1. **Production smoke test**:
   ```bash
   curl -X POST https://infolead.ca/api/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"hello"}],"lang":"en"}'
   ```
   - 200 with content → API works, frontend integration broken
   - 4xx/5xx → API broken, check sanitizer/prompt syntax

2. **Frontend integration check** in `src/scripts/demo/castor-controller.ts`:
   - Does it actually POST to `/api/chat`?
   - Does it parse response correctly?
   - Does it dispatch to TranscriptLog component?
   - Does it handle errors and surface them to UI?

3. **Most likely culprits** (check in order):
   - a) Backtick escaping bug from commit b00e1df (last-night fix) may have regressed in another file — grep for unescaped template literals in API route
   - b) Sanitizer over-stripping — if Castor's response gets emptied entirely by aggressive new regexes, controller may receive `{content: ""}` and not render
   - c) AgentStage shell not properly hydrating Castor controller (missing `client:load` directive)
   - d) Pre-filled greeting rendering broke the message append flow — first append uses different code path than subsequent

### Fix expectations

- Surface specific error to user in UI (currently silent failure):
  - `[ERROR] Connection failed. Retry?`
  - Use the same terminal-log style (red label) so it doesn't break visual consistency
- Add console.log in dev mode for controller state transitions
- Add the smoke-test curl to `docs/PROMPT_KNOWN_ISSUES.md` as an ongoing health check

---

## 3. Issue 2 — Card background transparency leak

### Symptom (images 1+2)

Both Castor and Lyra portraits use transparent PNG. Cards on `/demo` chooser have transparent or near-transparent background. Result: browser renders the PNG transparency as a checkerboard pattern — visible to users.

This is amateur-hour level visual bug. Critical for first-impression credibility.

### Fix spec

In `src/components/demo/TeamMemberCard.astro`:

```css
/* Castor card */
.team-card[data-agent="castor"] {
  background: linear-gradient(
    135deg,
    rgba(0, 30, 40, 0.95) 0%,
    rgba(0, 10, 26, 0.98) 100%
  );
  border: 1px solid rgba(0, 229, 255, 0.15);
}

.team-card[data-agent="castor"]:hover {
  border-color: rgba(0, 229, 255, 0.40);
  box-shadow: 0 0 40px rgba(0, 229, 255, 0.15);
}

/* Lyra card */
.team-card[data-agent="lyra"] {
  background: linear-gradient(
    135deg,
    rgba(40, 20, 60, 0.95) 0%,
    rgba(20, 10, 35, 0.98) 100%
  );
  border: 1px solid rgba(167, 139, 250, 0.15);
}

.team-card[data-agent="lyra"]:hover {
  border-color: rgba(167, 139, 250, 0.40);
  box-shadow: 0 0 40px rgba(167, 139, 250, 0.20);
}
```

**Critical**: the portrait `<img>` must sit on top of an opaque background layer. Verify by inspecting in DevTools — no checkerboard should be visible behind the head silhouette.

**Mobile-specific**: cards stack vertically, ensure each card has full background fill, no gap showing through to body.

---

## 4. Issue 3 — Lyra UX A+B+C improvements

(Spec from memory #26, finally being implemented this pass.)

### A. Status indicator redesign

**Current (bad)**: "TAP TO TALK" rendered as a button-like pill (image 4 bottom). Users mistake it for the action button.

**New spec**:
- Remove pill border, no background fill
- 11px font, `text-white/40` (very subtle)
- Letter-spacing `0.1em`, uppercase
- Position: above the mic button, centered
- States (English / Chinese pairs):
  - `idle` → `IDLE · 待机`
  - `listening` → `LISTENING · 聆听中`
  - `thinking` → `THINKING · 思考中`
  - `speaking` → `SPEAKING · 朗读中`
- Status dot prefix: 6px solid circle, color matches state
  - idle: `rgba(255,255,255,0.2)`
  - listening: cyan `#5EEAD4` pulsing
  - thinking: amber `#FFD700` pulsing
  - speaking: purple `#A78BFA` pulsing

### B. Microphone button promotion

**Current (bad)**: 44px circle with cartoon mic emoji 🎤, looks toy-like (images 1, 4 bottom).

**New spec**:
- Size: 64px diameter (mobile), 72px (desktop)
- Remove emoji entirely
- Replace with abstract symbol: a vertical microphone glyph drawn in SVG, using `currentColor`
- Background: `linear-gradient(135deg, #A78BFA 0%, #FFD700 100%)` (purple→gold)
- Border: 2px solid white at 0.15 opacity
- Hover/active state: scale(1.05) + outer purple glow
- Idle state: gentle breathing pulse (`@keyframes pulse 3s ease-in-out infinite`)
- Tap hint **below** the button (not on it):
  - EN: `Click to talk`
  - ZH: `点击开始说话`
  - Style: 11px, `text-white/40`, `letter-spacing: 0.05em`

### C. Text input demotion

**Current (bad)**: text input shares equal visual weight with mic button (image 4 bottom). Confuses users about which is primary action.

**New spec**:
- Width: reduce to ~60% of available width (mic button gets visual primacy)
- Border: `1px solid rgba(255,255,255,0.08)` (very subtle)
- Background: transparent
- Placeholder text:
  - EN: `Or type a message…`
  - ZH: `或文字输入(无法语音时)`
  - Style: italic, `text-white/30`
- Send button: ghost style (transparent bg, 1px purple border, purple text on hover)
- Position: BELOW the mic button + status indicator block, with `margin-top: 24px`

### Layout hierarchy (Lyra demo bottom panel, top→bottom)

```
[transcript log scrollable region]
        ⋮
[● LISTENING · 聆听中]      ← A: status indicator
        ⋮
[ 🎤 ]                       ← B: 64-72px mic button (gradient bg, no emoji)
[Click to talk · 点击说话]   ← B: hint below
        ⋮
[ Or type a message… ] [→]   ← C: demoted text input + ghost send
```

---

## 5. Issue 4 — Terminal log redesign (BIGGEST CHANGE)

### Current state (bad)

Conversation rendered as chat bubbles with double-layer borders (purple outer + gold inner), regular sans-serif font. Looks like WhatsApp.

### Visual reference: image 5 (Aplus Pilot Showcase)

```
// INF-CORE-01 LOG ACTIVE

[14:22:01] Inbound call detected: +1 (647) ***-****
[14:22:02] Language ID: Mandarin (CN)
[14:22:03] AI Receptionist: "您好,这里是 Aplus 体育俱乐部,请问需要帮您预约明天的羽毛球场地吗?"
[14:22:15] Customer: "是的,想订下午三点的两号场。"
[14:22:17] API Hook: Checking calendar availability...
[14:22:18] Success: Court 2 booked for 3PM Tomorrow.

_ SESSION COMPLETE _
```

### Castor terminal log spec

```
// CASTOR-CHAT-01 LOG ACTIVE

[08:34:12] CASTOR: 你好,我是 Castor — InfoLead 的 AI 技术主理人。我可以帮你...
[08:34:23] YOU: InfoLead 是做什么的?
[08:34:25] CASTOR: 我们最常被问到的就是 AI 语音前台...

_ SESSION ACTIVE _
```

### Lyra terminal log spec

```
// LYRA-VOICE-01 LOG ACTIVE

[08:35:01] LYRA: [slow] 网站加载慢确实会让人着急...
[08:35:18] YOU: 加载比较慢
[08:35:22] LYRA: 我能帮你优化网站的性能...

_ SESSION ACTIVE _
```

### CSS/Component spec

```css
.transcript-log {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.85);
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  /* No bubbles. No double borders. Just one outer container. */
}

.transcript-header {
  /* "// CASTOR-CHAT-01 LOG ACTIVE" */
  color: rgba(0, 229, 255, 0.6);  /* cyan for Castor */
  font-size: 11px;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.transcript-header[data-agent="lyra"] {
  color: rgba(167, 139, 250, 0.6);  /* purple for Lyra */
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  align-items: baseline;
  flex-wrap: wrap;
}

.log-timestamp {
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.log-role {
  font-weight: 600;
  flex-shrink: 0;
  letter-spacing: 0.05em;
}

.log-role[data-role="castor"] { color: #00E5FF; }   /* cyan */
.log-role[data-role="lyra"] { color: #A78BFA; }     /* purple */
.log-role[data-role="you"] { color: rgba(255,255,255,0.95); }
.log-role[data-role="system"] { color: #4ADE80; }   /* green for "Success:" */
.log-role[data-role="error"] { color: #F87171; }    /* red for errors */

.log-content {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.transcript-footer {
  /* "_ SESSION ACTIVE _" or "_ SESSION COMPLETE _" */
  text-align: center;
  color: rgba(255, 255, 255, 0.25);
  font-size: 10px;
  letter-spacing: 0.2em;
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.08);
}
```

### Long-text truncation interaction (Decision 5)

```typescript
interface LogEntryProps {
  timestamp: string;      // "08:34:12"
  role: 'castor' | 'lyra' | 'you' | 'system' | 'error';
  content: string;
  expandable?: boolean;   // computed from content length
}

// Threshold logic:
// - Mobile (<768px): truncate after 4 visible lines
// - Desktop (>=768px): truncate after 6 visible lines
// - Truncated state shows: first N lines + "… [展开 · Expand]"
// - Click anywhere on the entry expands; another click collapses
// - Use CSS line-clamp for visual truncation, JS for interaction
```

```css
.log-content--truncated {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;       /* mobile */
  overflow: hidden;
  cursor: pointer;
}

@media (min-width: 768px) {
  .log-content--truncated {
    -webkit-line-clamp: 6;     /* desktop */
  }
}

.log-expand-hint {
  display: inline-block;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  margin-left: 8px;
  cursor: pointer;
  user-select: none;
}

.log-expand-hint::before {
  content: '… [展开 · Expand]';
}

.log-content--expanded .log-expand-hint::before {
  content: '[收起 · Collapse]';
}
```

### Pre-filled greeting handling

The pre-filled greeting (Castor's "你好,我是 Castor...") is the FIRST log entry. It must:
- Use timestamp at page load time (`new Date().toTimeString().slice(0,8)`)
- Render with full role label `[HH:MM:SS] CASTOR:`
- Be truncated if it exceeds the line limit (no special-casing)

### Auto-scroll behavior

- New entries auto-scroll to bottom (preserve current behavior)
- If user scrolls up to read history, pause auto-scroll
- When user scrolls back to bottom, resume auto-scroll
- Show a subtle `↓ NEW MESSAGES` indicator when paused and new entries arrive

---

## 6. File Touch List

### CRITICAL — files that MUST change

```
src/components/demo/TeamMemberCard.astro       ← Issue 2: card backgrounds
src/components/demo/TranscriptLog.astro        ← Issue 4: complete rewrite to terminal style
src/components/demo/VoiceControlPanel.astro    ← Issue 3: A+B+C layout changes
src/styles/demo-shared.css                     ← Issue 4: new .transcript-log styles
src/styles/demo-lyra.css                       ← Issue 3: mic button + status + input
src/scripts/demo/castor-controller.ts          ← Issue 1: diagnose + fix
src/scripts/demo/transcript.ts                 ← Issue 4: log entry rendering + expand logic
```

### LIKELY — files that may need touching

```
src/scripts/demo/lyra-controller.ts            ← Issue 4: emit log entries instead of bubbles
src/components/demo/LyraConversationCore.tsx   ← Issue 3+4: wire status states to A's indicator; output to log not bubble
src/data/ai-team.ts                            ← Possibly add `loggerHeader` field per agent
```

### NEW — files to create

```
src/components/demo/LogEntry.astro             ← Reusable log entry component (or inline in TranscriptLog)
src/components/demo/MicButton.astro            ← Issue 3 B: SVG mic icon, no emoji
src/components/demo/StatusIndicator.astro     ← Issue 3 A: minimal status pill
src/scripts/demo/log-entry.ts                  ← Truncation + expand logic
```

### MUST NOT TOUCH (out of scope)

- `src/lib/chat-system-prompt.ts` — Castor v2.0 prompt is locked, do not modify
- `src/pages/api/chat.ts` (sanitizer logic) — only touch if Issue 1 root cause is here
- `src/pages/api/lyra-conversation.ts` (signed URL endpoint, if exists)
- ElevenLabs Lyra agent dashboard — out of repo
- `public/castor-portrait.png` / `public/lyra.png` — images stay as-is

---

## 7. Bundle Size Audit Targets

Before changes:
- Demo CSS+JS: ~30 KB raw / ~9 KB gzipped (well under 16 KB target)
- LyraConversationCore: 551 KB lazy-loaded
- HLS.js: 354 KB lazy-loaded

After v3 expected:
- Terminal log redesign: NET-NEUTRAL (replaces bubble CSS, similar size)
- New components (MicButton, StatusIndicator, LogEntry): +~2 KB
- Removed cartoon mic emoji handling: -~0.5 KB
- Truncation logic: +~1 KB
- **Net delta: +2-3 KB raw / ~1 KB gzipped**

**Mandatory audit**: `npm run build` after all commits, log final numbers in commit 8 message. >20% deviation triggers re-decision.

Monospace font: Use system font stack `'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace` — DO NOT load a web font for this. Adding a 50KB woff2 for Tomas terminal aesthetic is overkill; the system fallbacks work fine on mobile and desktop.

---

## 8. Commit Sequence

Each commit must build clean (`npm run build`), pass type check, and be deployable in isolation.

```
Commit 1 — fix(demo): diagnose and fix Castor /api/chat connectivity
  Files: src/scripts/demo/castor-controller.ts (+ fix file)
  Body: Root cause analysis (1-3 sentences) + fix description
  Smoke test: include the exact curl command that now returns 200

Commit 2 — fix(demo): add explicit gradient backgrounds to TeamMemberCards
  Files: src/components/demo/TeamMemberCard.astro
         src/styles/(wherever card styles live)
  Visual verification: no checkerboard visible behind portraits on chooser

Commit 3 — refactor(demo): replace bubble transcript with terminal log component
  Files: src/components/demo/TranscriptLog.astro (rewrite)
         src/components/demo/LogEntry.astro (new)
         src/scripts/demo/transcript.ts (rewrite)
         src/scripts/demo/log-entry.ts (new)
         src/styles/demo-shared.css (new .transcript-log block)
  Note: this is the largest commit; consider splitting into 3a (component scaffolding)
        + 3b (controller wiring) if the diff exceeds 400 LoC

Commit 4 — feat(demo): implement Lyra UX A+B+C
  Files: src/components/demo/StatusIndicator.astro (new)
         src/components/demo/MicButton.astro (new)
         src/components/demo/VoiceControlPanel.astro (refactor)
         src/components/demo/LyraConversationCore.tsx (wire status states)
         src/styles/demo-lyra.css

Commit 5 — feat(demo): truncation + expand interaction for long log entries
  Files: src/scripts/demo/log-entry.ts (truncation logic)
         src/styles/demo-shared.css (line-clamp CSS)

Commit 6 — chore: bundle audit + final verification
  Files: docs/PROMPT_KNOWN_ISSUES.md (append health check curl)
         docs/DEMO_V3_AUDIT.md (new — log final bundle numbers)
  Body: actual measured bundle sizes, manual smoke test results
```

**Push strategy**: Glen pushes manually after each commit, or batches all 6. Vercel auto-deploys main.

---

## 9. Manual QA Checklist (run after Commit 6 push)

Production smoke test on `infolead.ca`:

### Issue 1 verification

- [ ] `/zh/demo/castor` loads
- [ ] Pre-filled greeting renders as terminal log entry with timestamp
- [ ] Type "你是谁?" + send → response appears within 5s
- [ ] Type "what does InfoLead do?" + send → response is ONE story, not 1/2/3 list
- [ ] Type rapid 3 messages in a row → all 3 responses appear, ordered correctly
- [ ] Trigger a deliberate error (disconnect wifi mid-send) → red `[ERROR]` log entry appears

### Issue 2 verification

- [ ] `/zh/demo` chooser landing on iPhone Safari → no checkerboard behind Castor portrait
- [ ] Same on Lyra portrait
- [ ] Hover Castor card on desktop → cyan glow appears
- [ ] Hover Lyra card on desktop → purple glow appears
- [ ] WeChat in-app browser → both cards render correctly

### Issue 3 verification

- [ ] `/zh/demo/lyra` shows status indicator above mic button (not below)
- [ ] Status text reads `IDLE · 待机` initially, lowercase 11px
- [ ] Tap mic → status changes to `LISTENING · 聆听中` with cyan dot pulsing
- [ ] Lyra speaks → status changes to `SPEAKING · 朗读中` with purple dot pulsing
- [ ] Mic button is 64px+ on mobile, gradient bg purple→gold, no emoji
- [ ] Hint text "Click to talk · 点击开始说话" appears below mic
- [ ] Text input is below the mic group, smaller width, "Or type a message…" placeholder

### Issue 4 verification

- [ ] Castor and Lyra conversations render as terminal log (monospace, no bubbles)
- [ ] Each entry has `[HH:MM:SS]` timestamp + colored role label
- [ ] Castor role label is cyan, Lyra is purple, YOU is white, errors are red
- [ ] Header reads `// CASTOR-CHAT-01 LOG ACTIVE` or `// LYRA-VOICE-01 LOG ACTIVE`
- [ ] Footer reads `_ SESSION ACTIVE _`
- [ ] Long Castor response (4+ lines on mobile) shows `[展开 · Expand]` after 4 lines
- [ ] Click `[展开 · Expand]` → full content visible + label changes to `[收起 · Collapse]`
- [ ] Auto-scroll works for new entries
- [ ] Scrolling up pauses auto-scroll; subtle indicator appears

### Cross-cutting

- [ ] EN ↔ ZH route parity (all changes mirrored in both languages)
- [ ] iPhone Safari, Chrome desktop, WeChat in-app, Tesla browser (low priority)
- [ ] Lighthouse Performance ≥ 85 mobile, ≥ 95 desktop on `/demo`, `/demo/castor`, `/demo/lyra`
- [ ] Bundle size delta documented in commit 6 body

---

## 10. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Castor API root cause is in sanitizer (Issue 1) | If so, Commit 1 must NOT introduce regressions to Castor v2 prompt behavior. Re-run smoke prompts ("you are who", "what do you do", "how much") to confirm nothing broke. |
| Terminal log word-break on Chinese text | Verify `word-break: break-word` works correctly with CJK; may need `overflow-wrap: anywhere` |
| LyraConversationCore.tsx integration with new TranscriptLog | The existing Lyra component emits its own bubbles; need to refactor it to emit log entries to the shared TranscriptLog instead. May add 30-60 minutes. |
| Truncation breaks ElevenLabs streaming Lyra responses | Lyra streams text token-by-token. Truncation should only apply to FINAL settled content, not mid-stream. Add `data-streaming` attr to skip truncation while streaming, apply on stream-end. |
| Status indicator wired to ElevenLabs SDK callbacks | ElevenLabs `useConversation()` exposes `isSpeaking`, `isListening`, etc. Wire these directly to StatusIndicator's state prop. |

**No open questions for Glen** — all 4 decisions locked at start of brief. If Claude Code finds unexpected blockers during /plan, surface and wait for input.

---

## 11. Reference Image (paste into Claude Code chat alongside this brief)

The user uploaded image 5 to the original conversation showing Aplus Pilot Showcase terminal style — `/mnt/user-data/uploads/photo.jpeg`. Glen will paste this image directly into Claude Code's input when starting the /plan session, so Claude Code can visually anchor the terminal log redesign.

Key visual elements from image 5:
- Black terminal window with rounded corners, traffic-light dots
- Cyan terminal header `// INF-CORE-01 LOG ACTIVE`
- Timestamp prefix `[14:22:01]` in white
- Role labels in distinct colors:
  - `Inbound call detected:` plain white
  - `Language ID:` plain white
  - `AI Receptionist:` yellow/gold
  - `Customer:` white
  - `API Hook:` purple
  - `Success:` bright green
- Underline-bracketed footer `_ SESSION COMPLETE _`
- Generous line-height
- Monospace throughout

Match this aesthetic. Don't be cute — terminal log is the brand promise.

---

## 12. Out of Scope (do NOT implement in this work)

- ❌ Any change to Castor v2.0 prompt or sanitizer logic (unless it's the root cause of Issue 1)
- ❌ Lyra ElevenLabs agent backend config changes
- ❌ New routes, new agents, new API endpoints
- ❌ Image asset optimization (Castor portrait stays 24-bit until manual reshoot)
- ❌ Mobile homepage video bandwidth optimization
- ❌ Hot-reload prompt architecture (Phase 1 deferred per Glen's decision)
- ❌ A/B testing infrastructure
- ❌ Analytics / event tracking

---

## 13. Success Criteria

After Commit 6 push and manual QA pass:

1. ✅ Castor `/demo/castor` chat works end-to-end (Issue 1)
2. ✅ Zero checkerboard visible on chooser landing portraits (Issue 2)
3. ✅ Lyra demo bottom panel: status indicator → mic button (gradient, no emoji) → text input fallback (Issue 3)
4. ✅ Both Castor and Lyra conversations render as terminal log, monospace, colored role labels, no bubbles (Issue 4)
5. ✅ Long messages truncate at 4 mobile / 6 desktop lines + `[展开 · Expand]` works
6. ✅ Bundle size delta < 5 KB gzipped vs v2.1 baseline
7. ✅ EN/ZH parity maintained
8. ✅ Production smoke test passes on iPhone Safari + Chrome desktop + WeChat browser

---

**End of v3 brief. Ready for Claude Code `/plan` mode.**

Glen's instruction to Claude Code:
> "Use docs/DEMO_REBUILD_PLAN_v3.md as the spec. Image 5 (terminal log reference) attached. /plan first, do not write code until I approve. Auto-commit allowed after plan approval."
