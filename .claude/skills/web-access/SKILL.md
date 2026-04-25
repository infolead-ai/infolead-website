---
name: web-access
description: Research, fetch, and analyze live web content using search and URL retrieval. Use this skill whenever you need current information from the web — competitor analysis, documentation lookup, scraping page content, checking if a site is live, reading GitHub READMEs, inspecting npm/PyPI packages, verifying API docs, finding latest library versions, or any task where you'd say "let me Google that." Also trigger for: "look up X", "check the docs for Y", "what does Z's homepage say", "find the latest version of", "is this URL working".
---

# Web Access Skill

You have the ability to access live web content via `curl`, `wget`, or Node.js `fetch` inside bash. Use this to retrieve real-time information.

## Core Patterns

### 1. Fetch a URL (clean text)
```bash
curl -sL "https://example.com" | python3 -c "
import sys, html, re
body = sys.stdin.read()
# Strip tags and decode
text = re.sub(r'<[^>]+>', ' ', body)
text = html.unescape(text)
text = re.sub(r'\s+', ' ', text).strip()
print(text[:5000])
"
```

### 2. Get page title + meta description
```bash
curl -sL "https://example.com" | python3 -c "
import sys, re, html
body = sys.stdin.read()
title = re.search(r'<title[^>]*>(.*?)</title>', body, re.I|re.S)
desc = re.search(r'<meta[^>]+name=[\"\'](description|og:description)[\"\']\s+content=[\"\'](.*?)[\"\']', body, re.I)
print('Title:', html.unescape(title.group(1).strip()) if title else 'N/A')
print('Desc:', html.unescape(desc.group(2).strip()) if desc else 'N/A')
"
```

### 3. Check HTTP status + headers
```bash
curl -sI "https://example.com" | head -20
```

### 4. Download a file
```bash
curl -sL "https://example.com/file.json" -o /tmp/downloaded.json
cat /tmp/downloaded.json | python3 -m json.tool | head -50
```

### 5. Check npm package latest version
```bash
curl -s "https://registry.npmjs.org/astro/latest" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"Latest: {d['version']}\")
print(f\"Description: {d.get('description','')}\")
"
```

### 6. GitHub raw file fetch
```bash
# Convert github.com URL to raw.githubusercontent.com
curl -sL "https://raw.githubusercontent.com/OWNER/REPO/main/README.md" | head -100
```

## Workflow

1. **Identify** what URL or query the user needs
2. **Fetch** using the appropriate pattern above
3. **Parse** — strip HTML noise, extract relevant content
4. **Summarize** — present findings concisely; don't dump raw HTML
5. **Cite** — always mention the source URL

## Competitive Research Pattern (InfoLead use case)

When asked to analyze competitors or compare services:
```bash
# For each competitor URL, fetch and extract:
# - Hero headline / value prop
# - Pricing (if visible)
# - Key features listed
# - Tech stack signals (generator meta tags, script sources)
```

## Limitations & Fallbacks

- **JavaScript-heavy SPAs**: `curl` only gets the initial HTML shell. Mention this limitation and suggest using the browser tool if available.
- **Auth-gated pages**: Cannot access. Tell the user.
- **Rate limiting**: Add `sleep 1` between multiple requests to same domain.
- **HTTPS errors**: Try adding `--insecure` flag (note: for inspection only, not production use).

## Network Note for InfoLead Project

Network access may be restricted in some environments. If `curl` fails with a connection error, inform the user and suggest alternatives (e.g., user pastes content manually, or use the Claude.ai web search tool instead).
