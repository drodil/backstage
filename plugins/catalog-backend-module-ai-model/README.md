# @backstage/plugin-catalog-backend-module-ai-model

Adds support for the `AiResource` entity kind to the catalog backend plugin. AI resources represent contextual information consumed by AI coding tools, such as skills and rules.

## Installation

Add the module to your backend:

```ts
backend.add(import('@backstage/plugin-catalog-backend-module-ai-model'));
```

## Entity shape

```yaml
apiVersion: backstage.io/v1alpha1
kind: AiResource
metadata:
  name: frontend-design
  description: Skill for creating production-grade frontend interfaces
spec:
  type: skill
  lifecycle: production
  owner: ai-platform-team
  system: ai-tooling
  disciplines:
    - web
  categories:
    - framework
  agents:
    - claude-code
  dependsOn:
    - airesource:default/base-coding-standards
```

The `type` field determines which spec fields are available. Currently supported types:

- **`skill`** — reusable contextual knowledge for AI coding tools. Supports additional fields: `disciplines`, `categories`, `agents`, `dependsOn`.
- **`rule`** — governance rules and constraints for AI coding tools. Supports additional fields: `disciplines`, `category` (required), `rationale` (required).

Any other `type` value is accepted with the base spec fields: `type`, `lifecycle`, `owner`, and optionally `system`.

## Accessing skill and rule content

The actual content of skills and rules is not stored in the entity spec. Instead, the source file is referenced via the standard `backstage.io/source-location` annotation, consistent with how other Backstage entities reference their source files. Entity providers that generate `AiResource` entities from `SKILL.md` or rule files should set this annotation to point to the source file.

## Skills endpoint for `npx skills`

This module exposes a [`/.well-known/skills/`](https://www.skills.sh/docs/cli) endpoint on the root HTTP router, making skills registered in the catalog discoverable by the [`npx skills`](https://www.skills.sh/) CLI tool.

When a Backstage instance has this module installed, you can install skills from it using:

```sh
npx skills add https://your-backstage.example.com
```

### Endpoint details

| Path                                 | Description                                  |
| ------------------------------------ | -------------------------------------------- |
| `/.well-known/skills/index.json`     | Returns a JSON index of all available skills |
| `/.well-known/skills/:name/SKILL.md` | Returns the content of a specific skill      |

The index only includes `AiResource` entities with `spec.type: skill` that have a valid `backstage.io/source-location` annotation pointing to a reachable URL. Skills whose content cannot be retrieved are silently excluded from the index.

### Caching

Skill content and the index are cached for 5 minutes using the Backstage cache service. This avoids repeated fetches of the underlying source files on every request.

### Requirements

For skills to appear in the endpoint:

1. The entity must be of kind `AiResource` with `spec.type: skill`
2. The entity must have a `backstage.io/source-location` annotation of type `url:` pointing to the SKILL.md file
3. The URL must be readable by the configured URL reader (i.e. included in `integrations` or `reading.allow` configuration)
