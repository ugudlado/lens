---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeScript Rules

## Enums over string literals

Prefer `enum` or `const enum` over string union types for any named set of values.

**Do:**
```ts
const enum ConfigScope { Managed = 'managed', Global = 'global', Project = 'project', Local = 'local' }
enum ServerType { Stdio = 'stdio', Http = 'http', Sse = 'sse' }
```

**Don't:**
```ts
type ConfigScope = 'managed' | 'global' | 'project' | 'local';
type ServerType = 'stdio' | 'http' | 'sse';
```

This applies to: scopes, surface names, server types, view modes, and any other named set used across files.
