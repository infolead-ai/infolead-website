# InfoLead AI — Claude Code Rules

> 项目背景、品牌规范、技术栈详情 → 读 `.claude/skills/pua/SKILL.md`

---

## 输出规则

1. 直接给结论，不要前置铺垫和引导词（"好的"、"让我来"、"当然"）
2. 不要复述我的问题，不要捧场（"很棒的问题"、"非常聪明"）
3. 简单问题一句话，复杂问题再展开
4. 不要在回答末尾加总结
5. 不确定就直接停下来问，不要猜

---

## 工作流程

- **动手前先列计划**，等确认再开始写代码
- **每次重大改动前**报告 estimate，完成后报告 measured，偏差 >20% 停下来重新决策
- **只 commit，不 push**，Glen 自己控制部署节奏

---

## 硬规则（不得违反）

- 网站任何数字/百分比，没有数据来源的一律不写
- 所有面向用户的文字必须同时有 `/en/` 和 `/zh/` 版本
- 不得 commit API keys、密码、token

---

## 技术栈速查

Astro + TypeScript + Tailwind · Vercel 部署 · Cloudflare DNS
Repo: `infolead-ai/infolead-website`
