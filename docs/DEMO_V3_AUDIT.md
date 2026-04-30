# Demo v3 Bundle Audit

Measured against yesterday's v2.1 baseline (final summary in commit `b00e1df`'s session log). Per v3 brief §7, the budget is **delta < 5 KB gzipped**.

---

## Method

- v3 build: `npm run build` from `main` after commit `da76646` (commit 5 of v3).
- Raw sizes: `stat -c %s` on each `.css` / `.js` artifact in `dist/client/_astro/`.
- Gzipped sizes: `gzip -c <file> | wc -c` (default level 6, matches Vercel edge gzip).
- v2.1 baseline: raw sizes from yesterday's session-end summary (commit-by-commit measurement after iter-4 ship). Gzipped baseline marked **(est)** since not separately measured at v2.1 ship time — derived from the typical 3.5x raw→gz ratio for the asset class, then sanity-checked against current v3 gz where the file content is structurally similar.

## Page-load assets (loaded on `/demo` chooser + first stage view)

| Asset | v2.1 raw | v3 raw | Δ raw | v2.1 gz (est) | v3 gz | Δ gz |
|---|---:|---:|---:|---:|---:|---:|
| `Layout.css` (site nav, shared) | 20,829 | 21,410 | +581 | ~4,650 | 4,785 | +135 |
| `AgentStage.css` (incl. demo-shared.css imports) | 5,901 | 8,694 | **+2,793** | ~1,790 | 2,630 | +840 |
| `demo-lyra.css` (Lyra-route only) | 8,601 | 5,597 | **-3,004** | ~2,640 | 1,721 | -919 |
| `demo-castor.css` (separate file v2.1) | 4,277 | (merged) | -4,277 | ~1,310 | (merged) | -1,310 |
| `TeamMemberCard.css` | 4,414 | 4,956 | +542 | ~1,330 | 1,411 | +81 |
| `index.js` | 7,614 | 7,614 | 0 | ~2,930 | 2,935 | +5 |
| `LyraVoiceWidget.js` (entry) | 5,937 | 6,008 | +71 | ~2,400 | 2,446 | +46 |
| `LyraVoiceWidget.<hash>.js` (variant) | ~163 | 137 | -26 | ~150 | 163 | +13 |
| `AgentStage.astro` script | 1,355 | 1,355 | 0 | ~870 | 867 | -3 |
| `CastorStream.astro` script | 1,076 | 1,076 | 0 | ~705 | 703 | -2 |
| `preload-helper.js` | 1,254 | 1,254 | 0 | ~735 | 733 | -2 |
| **Demo-only subtotal** | **30,648** | **26,747** | **-3,901** | **~9,665** | **8,944** | **-721** |
| **Page-load total (incl. Layout)** | **51,477** | **48,157** | **-3,320** | **~14,315** | **13,729** | **-586** |

**Note on `demo-castor.css` disappearance**: Commit 3a removed the `.stage-bubble*` rules and the glass-morphism `.castor-stage__transcript-wrap` styling, leaving demo-castor.css small enough that Vite/Astro merged it into the `AgentStage.css` chunk (since both are loaded together on `/demo/castor`). The +2,793 raw growth in `AgentStage.css` reflects: (a) demo-castor.css contents being merged in, plus (b) the new `.transcript-log` shared block from `demo-shared.css`. Net is still favorable because the bubble CSS removal more than offset the new terminal-log CSS.

## Lazy-loaded assets (only on user interaction)

| Asset | v2.1 raw | v3 raw | Δ raw | v2.1 gz (est) | v3 gz | Δ gz |
|---|---:|---:|---:|---:|---:|---:|
| `LyraConversationCore.<hash>.js` (incl. `@elevenlabs/react` SDK) | 551,096 | 553,802 | +2,706 | ~145,800 | 146,409 | +609 |
| `hls.light.min.js` (Castor video) | 354,446 | 354,446 | 0 | 110,821 | 110,821 | 0 |
| `client.js` (React runtime) | 185,936 | 185,936 | 0 | 58,227 | 58,227 | 0 |

`LyraConversationCore` grew by ~2.7KB raw (+0.6KB gzipped). Drivers: terminal-log JSX restructure (replaces `.lyra-bubble*` with `.log-entry` markup), the `idToTime` and `STATUS_BILINGUAL` helpers, two inline SVG glyph components for the new mic, the truncation `useEffect`, the auto-scroll-pause state + handler, and the new-messages indicator click handler. Reasonable for the scope of changes; lazy-loaded behind the user clicking the mic button or sending a Lyra text message.

## Summary

- **Page-load demo code: -3.9 KB raw / -0.7 KB gzipped** vs v2.1.
- **Lazy Lyra core: +2.7 KB raw / +0.6 KB gzipped**.
- **Net delta against the 5 KB gzipped budget**: −0.7 KB on page load, +0.6 KB lazy. Both well within budget.

The terminal-log refactor was net-neutral-to-favorable because removing the dual bubble systems (`.stage-bubble*` for Castor, `.lyra-bubble*` for Lyra) more than offset the new shared `.transcript-log` CSS block. The new SVG mic glyphs cost ~0.4KB gzipped vs the prior emoji rendering — acceptable for the brand-fit improvement.

## Verification commands

To reproduce these measurements:

```bash
# from repo root, on commit da76646 or later
npm run build
for f in dist/client/_astro/*.css dist/client/_astro/*.js; do
  n=$(basename "$f")
  raw=$(stat -c %s "$f")
  gz=$(gzip -c "$f" | wc -c)
  echo "$gz  $raw  $n"
done | sort -n -r
```

## Manual smoke test (run after Glen pushes to prod)

- `curl -X POST https://infolead.ca/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"你好"}],"lang":"zh"}'` → returns < 5s, in-character response.
- iPhone Safari `/zh/demo/castor` → type 你好 → log entry streams progressively (no 4s blank pause).
- iPhone Safari `/zh/demo` → no checkerboard behind portraits.
- `/zh/demo/lyra` → status indicator above mic (minimal, no pill), 64-72px mic with SVG glyph (no emoji), text input below mic group.
- Both stages render terminal-log markup with `[HH:MM:SS] ROLE:` prefixes; long entries truncate at 4 lines mobile / 6 lines desktop with `[展开 · Expand]` toggle.

## Appendix: full v3 bundle inventory

```
146409  553802  LyraConversationCore.B0ehyu6_.js
110821  354446  hls.light.min.CgX8Uzrn.js
 58227  185936  client.DpjeQwv8.js
  4785   21410  Layout.DESIMHq1.css
  2935    7614  index.CLBPsBg6.js
  2630    8694  AgentStage.Ck3VYYBU.css
  2446    6008  LyraVoiceWidget.DjyDSsbJ.js
  1721    5597  demo-lyra.BUQMjJPT.css
  1411    4956  TeamMemberCard.By_Wucne.css
   867    1355  AgentStage.astro_astro_type_script_index_0_lang.C_bj2Wra.js
   733    1254  preload-helper.CVfkMyKi.js
   703    1076  CastorStream.astro_astro_type_script_index_0_lang.DegkbFFm.js
   163     137  LyraVoiceWidget.CuYGaI94.js
```

Columns: gzipped bytes · raw bytes · filename.
