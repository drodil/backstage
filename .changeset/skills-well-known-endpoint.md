---
'@backstage/plugin-catalog-backend-module-ai-model': patch
---

Added a well-known skills endpoint at `/.well-known/skills/` that serves skill metadata and
content for use with `npx skills`. The endpoint discovers catalog entities of kind `AiResource`
with `spec.type: skill` and serves their content from the source location.
Results are cached for 5 minutes.
