---
name: pua
description: Project Understanding Assistant — instantly load full InfoLead project context including brand, tech stack, business model, client pipeline, and governance rules. Use this skill at the START of any InfoLead session, or whenever you're unsure about brand guidelines, business rules, pricing, architecture decisions, or the difference between Castor and Lyra. Also trigger for: "what's our brand color", "what's the pricing model", "remind me of the tech stack", "who is Castor", "what repo do we use", "what's the business model", "explain the InfoLead project", "where are we at with X client".
---

# PUA — Project Understanding Assistant
## InfoLead Technology Inc. · Full Project Context

Read this skill at the start of every Claude Code session for InfoLead work. It gives you the full project context without the user having to re-explain everything.

---

## 🏢 Company Identity

| Field | Value |
|---|---|
| **Legal name** | InfoLead Technology Inc. |
| **Marketing name** | InfoLead AI / 赢领智能 |
| **Domain** | infolead.ca |
| **Location** | Toronto, Ontario, Canada (GTA market) |
| **Target clients** | GTA Chinese-background SMBs |
| **Founder (public)** | Glen Tang |
| **Founder (legal)** | Yun Tang |
| **Email** | dev@infolead.ca |

---

## 💼 Business Model

- **SaaS Subscription**: $1,500 CAD setup fee + $499 CAD/month
- **Core Product**: "InfoLead Voice Core" — bilingual AI receptionist (Twilio + ElevenLabs + calendar + CRM + admin dashboard)
- **Pattern**: Each new client = Voice Core (reusable framework) + customization layer
- **Year 1 Target**: Month 12 → 10 clients × $499 = $4,990 MRR
- **Client pipeline**:
  - Aplus Sport Club — Proposal sent, awaiting reply. Option B recommended: $3,000 setup + $599/month (website + Voice Core bundle)
  - Next client: TBD (target: medical clinics, real estate, restaurants)

---

## 🎨 Brand System

### Colors
| Token | Hex | Usage |
|---|---|---|
| Neon Cyan | `#00E5FF` | Castor brand, primary CTA, tech accent |
| Soft Purple | `#A78BFA` | Lyra brand, secondary accent |
| Warm Gold | `#FFD700` | Lyra brand highlight |
| Deep Space | `#0A0A1A` | Dark background (InfoLead site) |

### AI Representatives
**Castor · 星语** (AI Technology Host)
- Visual: 30yo Central Asian male, black turtleneck, deep space background, neon cyan lighting
- Voice/Tone: Technical, rational, answers "how does it work"
- Brand color: `#00E5FF`
- Cloudflare Stream video: `d16e68b2fbfeb0c080a1c55757b0b2da`

**Lyra · 星曲** (AI Brand Storyteller / 品牌叙事官)
- Visual: 25yo mixed Central Asian female, deep chestnut wavy hair with soft purple ombre, cream/soft-purple turtleneck
- Voice/Tone: Emotional, narrative, answers "why does it matter"
- Brand colors: `#A78BFA` + `#FFD700`
- Theme song: 《If I Were a Human》/《若我是人》 (Beyoncé "If I Were a Boy" style, A minor, 78-84 BPM)

### Brand Voice Rules (from Brand Bible)
- ✅ Use: "seconds-fast response", "bilingual from the first hello", "24/7 always on"
- ❌ Never use: "99.8% accuracy", "zero error rate", "flawless" (violates CA Competition Act)
- ❌ Never claim: Castor or Lyra are "real people" or have legal authority

---

## 🛠 Tech Stack

```
Frontend:    Astro + TypeScript + Tailwind CSS
Routes:      /en/  and  /zh/  (physical bilingual routing)
Hosting:     Vercel (auto-deploy from GitHub main)
DNS:         Cloudflare (infolead.ca)
Email:       Cloudflare Email Routing → dev@infolead.ca
Repo:        github.com/infolead-ai/infolead-website
Video CDN:   Cloudflare Stream ($5/month Starter Bundle)
Video impl:  HLS.js + native <video> (CastorStream.astro)
             click-to-play: poster + neon cyan play button
```

### Key Files
```
src/
├── components/CastorStream.astro   ← Castor video player
├── layouts/Layout.astro            ← Nav + hamburger + lang switcher
├── data/services.ts                ← Service data
├── pages/
│   ├── en/                         ← English pages
│   └── zh/                         ← Chinese pages
```

---

## 🔧 Development Workflow (Glen's Rules)

1. **Always `/plan` first** — never touch code without a plan in Claude Code
2. **Package size discipline** — estimate vs measured delta >20% = STOP and re-decide
3. **Commit ≠ Push** — Claude Code commits; Glen pushes manually to control deploys
4. **Three governing docs**:
   - `CLAUDE.md` — project governance for Claude Code
   - Brand Bible — Castor + Lyra identity rules
   - `PROJECT_LOG.md` — decision history
5. **No fabricated claims** — if a number isn't proven, don't put it on the site

---

## 📱 Social Media

| Platform | Handle |
|---|---|
| English platforms | @infoleadai |
| Chinese platforms | InfoLead 赢领智能 |
| LinkedIn | Glen Tang (currently under ID verification review) |

---

## 🚦 Current Status (as of 2026-04-25)

- ✅ Website live on Vercel
- ✅ Castor video streaming (HLS, cross-platform including WeChat browser)
- ✅ Bilingual routing /en/ /zh/
- ✅ Compliance fix: removed "99.8% accuracy" claim
- ✅ Aplus proposal submitted (PDF + anniversary poster)
- ⏳ LinkedIn account under review (name mismatch: Glen vs Yun)
- ⏳ Twilio re-registration (blocked on account, needed for Voice Core)
- ⏳ Second AI representative Lyra: HeyGen video production pending
- ⏳ Theme song production: Music Muse AI (musicmuse.ai) — Glen subscribed

---

## 🧭 Quick Reference: Common Tasks

| Task | Where to look |
|---|---|
| Edit homepage copy | `src/pages/en/index.astro` + `src/pages/zh/index.astro` |
| Change brand color | `tailwind.config.ts` + CSS vars in Layout.astro |
| Add new service | `src/data/services.ts` |
| Update nav | `src/layouts/Layout.astro` |
| Castor video | `src/components/CastorStream.astro` |
| Deploy | `git push origin main` (Glen does this) |
