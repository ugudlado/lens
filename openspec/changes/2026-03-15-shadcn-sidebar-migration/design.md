# Design: Migrate Lens UI to shadcn/ui with Sidebar Layout

## Approach Selection

### Option A: Full shadcn sidebar block (Selected)

Install shadcn components as local source files. Use the official sidebar block pattern (SidebarProvider > Sidebar > SidebarInset). Map the existing Tailwind theme to shadcn's CSS variable system.

**Pros**: Battle-tested layout, built-in collapse/expand, proper accessibility, consistent with shadcn ecosystem for future component adoption.

**Cons**: Requires CSS variable mapping, adds ~15-20KB to bundle, need to adapt WorkspaceSwitcher to new context.

### Option B: Custom collapsible sidebar with Radix primitives

Build a custom collapsible sidebar using only Radix UI primitives directly, without the shadcn component layer.

**Rejected**: Re-invents what shadcn already provides. The sidebar component is the most complex piece -- using the pre-built version saves significant effort and gives better accessibility.

### Option C: Headless UI (Headless UI library)

Use Headless UI for accessible primitives.

**Rejected**: Headless UI is Tailwind Labs' library but lacks a sidebar component. Would still need custom sidebar implementation.

## shadcn Setup

### Initialization

shadcn/ui requires a `components.json` configuration file at the UI package root. Since this is a monorepo with the UI app at `apps/ui/`, the config lives there.

[ASSUMPTION] We will manually create the shadcn config and component files rather than using `npx shadcn@latest init`, which has had issues with pnpm monorepos and worktrees (see memory: observation #6596). This avoids store path conflicts.

**`apps/ui/components.json`**:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "hooks": "@/hooks"
  }
}
```

### Path Alias Configuration

shadcn components use `@/` imports. Configure this in both TypeScript and Vite.

**`apps/ui/tsconfig.json`** -- add paths:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**`apps/ui/vite.config.ts`** -- add resolve alias:
```ts
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ... existing config
});
```

### Dependencies

New dependencies for `apps/ui/package.json`:

```
dependencies:
  class-variance-authority    # Component variant management (used by shadcn)
  clsx                        # Conditional class joining
  tailwind-merge              # Deduplicates Tailwind classes
  lucide-react                # Icon library (shadcn default)
  @radix-ui/react-collapsible # Collapsible primitive
  @radix-ui/react-dialog      # Dialog/Sheet primitive
  @radix-ui/react-dropdown-menu # Dropdown primitive
  @radix-ui/react-separator   # Separator primitive
  @radix-ui/react-slot        # Slot primitive (used by Button)
  @radix-ui/react-tooltip     # Tooltip primitive

devDependencies:
  tailwindcss-animate         # Animation utilities for shadcn
```

## CSS Variable Mapping

shadcn uses HSL CSS variables for theming. The current Lens hex colors must be converted to HSL and mapped to shadcn's variable names.

### Color Conversion Table

| Current Name | Hex | HSL | shadcn Variable |
|-------------|-----|-----|-----------------|
| bg | #0c0b0a | 30 9% 3% | `--background` |
| sidebar | #100f0e | 30 7% 5% | `--sidebar-background` |
| card | #161412 | 30 10% 8% | `--card` |
| border | #252220 | 24 11% 13% | `--border` |
| accent | #c07b2e | 32 63% 47% | `--sidebar-accent`, `--primary` |
| accent-hover | #d4922d | 36 66% 50% | `--sidebar-accent-foreground`, `--primary-foreground` |

### CSS Variables Block (added to `src/index.css`)

```css
@layer base {
  :root {
    --background: 30 9% 3%;
    --foreground: 0 0% 95%;
    --card: 30 10% 8%;
    --card-foreground: 0 0% 90%;
    --popover: 30 10% 8%;
    --popover-foreground: 0 0% 90%;
    --primary: 32 63% 47%;
    --primary-foreground: 0 0% 100%;
    --secondary: 30 7% 12%;
    --secondary-foreground: 0 0% 80%;
    --muted: 30 7% 12%;
    --muted-foreground: 0 0% 45%;
    --accent: 32 63% 47%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 62% 50%;
    --destructive-foreground: 0 0% 100%;
    --border: 24 11% 13%;
    --input: 24 11% 13%;
    --ring: 32 63% 47%;
    --radius: 0.5rem;

    /* Sidebar-specific variables (shadcn sidebar) */
    --sidebar-background: 30 7% 5%;
    --sidebar-foreground: 0 0% 70%;
    --sidebar-primary: 32 63% 47%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 32 63% 47%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 24 11% 13%;
    --sidebar-ring: 32 63% 47%;
  }
}
```

### Tailwind Config Changes

```js
// tailwind.config.js
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Keep existing direct colors for backward compat
        bg: "#0c0b0a",
        sidebar: "#100f0e",
        card: "#161412",
        border: "#252220",
        accent: "#c07b2e",
        "accent-hover": "#d4922d",
        // shadcn CSS variable references
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

[ASSUMPTION] Keeping the original direct hex color names (`bg`, `sidebar`, `card`, `border`, `accent`) alongside the new shadcn CSS variable references ensures backward compatibility. Existing panel components using `bg-card`, `border-border`, `text-accent` etc. continue to work without changes. The shadcn components use the CSS variable versions (`background`, `primary`, etc.).

## Layout Architecture

### Current Layout

```
<div flex min-h-screen>
  <Sidebar w-52 fixed />       -- 208px, never collapses
  <main flex-1>
    <header>search + toggle</header>
    <div flex-1 p-6>{content}</div>
  </main>
</div>
```

### New Layout (shadcn pattern)

```
<SidebarProvider defaultOpen={true}>
  <AppSidebar />                    -- Collapsible, manages own width
  <SidebarInset>
    <header>
      <SidebarTrigger />            -- Collapse/expand button
      <Separator orientation="vertical" />
      <HeaderSearch />
      <GlobalEditsToggle />
    </header>
    <main className="flex-1 p-6">
      {renderContent()}
    </main>
  </SidebarInset>
</SidebarProvider>
```

The SidebarProvider manages open/collapsed state via React context. SidebarInset is the main content wrapper that automatically adjusts its margin when the sidebar collapses.

## AppSidebar Component Design

### Component Mapping

| Current Sidebar Element | shadcn Component | Notes |
|------------------------|------------------|-------|
| `<aside>` container | `<Sidebar collapsible="icon">` | Enables icon-collapse mode |
| Logo + version header | `<SidebarHeader>` | Shows "LENS v1.3.0" |
| WorkspaceSwitcher | `<SidebarFooter>` wrapping adapted WorkspaceSwitcher | Move to footer per sidebar block convention |
| Nav group label | `<SidebarGroup>` + `<SidebarGroupLabel>` | "INSTRUCTIONS", "CAPABILITIES", etc. |
| Nav item button | `<SidebarMenuItem>` + `<SidebarMenuButton>` | Each of the 13 items |
| Unicode icon | Lucide React icon component | Mapped per section |
| Count badge | `<SidebarMenuBadge>` or custom span | Right-aligned count |
| Active glow effect | `data-active` attribute + CSS | Custom styling via shadcn's data attributes |

### Icon Mapping (Unicode to Lucide)

| Section | Current | Lucide Icon | Import |
|---------|---------|-------------|--------|
| Overview | `▦` | `LayoutDashboard` | `lucide-react` |
| CLAUDE.md | `◧` | `FileText` | `lucide-react` |
| Rules | `▤` | `Scale` | `lucide-react` |
| Memory | `◌` | `Brain` | `lucide-react` |
| Skills | `✦` | `Sparkles` | `lucide-react` |
| Agents | `◫` | `Bot` | `lucide-react` |
| Commands | `▷` | `Terminal` | `lucide-react` |
| MCP Servers | `◉` | `Server` | `lucide-react` |
| Hooks | `◆` | `Webhook` | `lucide-react` |
| Plugins | `⬡` | `Puzzle` | `lucide-react` |
| Settings | `◎` | `Settings` | `lucide-react` |
| Permissions | `◈` | `Shield` | `lucide-react` |
| Sandbox | `◻` | `Box` | `lucide-react` |

### AppSidebar Structure

```tsx
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-baseline gap-2 px-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">
            {APP_NAME}
          </span>
          <span className="text-[10px] text-muted-foreground">v{APP_VERSION}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={active === item.key}
                      tooltip={item.label}
                      onClick={() => onNavigate(item.key)}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {count > 0 && (
                      <SidebarMenuBadge>{count}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <WorkspaceSwitcher ... />
      </SidebarFooter>
    </Sidebar>
  );
}
```

### Active Item Styling

The shadcn SidebarMenuButton supports `isActive` prop and `data-active` attribute. Override the default active style to match the warm amber theme:

```css
/* In index.css or as Tailwind utilities */
[data-sidebar="menu-button"][data-active="true"] {
  background-color: hsl(32 63% 47% / 0.1);
  color: hsl(32 63% 47%);
  border-right: 2px solid hsl(32 63% 47%);
  box-shadow: inset -2px 0 8px -2px hsl(32 63% 47% / 0.15);
}
```

## WorkspaceSwitcher Adaptation

The current WorkspaceSwitcher is a custom dropdown. For the shadcn sidebar, it moves to `SidebarFooter` and uses `DropdownMenu` from shadcn for the popup, or retains its custom dropdown but adapts to collapse behavior.

**Strategy**: Keep the current WorkspaceSwitcher logic but wrap it so that:
- In expanded mode: shows full workspace name + chevron (current behavior)
- In collapsed mode: shows a folder icon that opens the dropdown on click

The `useSidebar()` hook provides `state` ("expanded" | "collapsed") to conditionally render.

## Migration Plan

### Phase Order Rationale

1. **Foundation first**: CSS variables and dependencies must exist before any shadcn component works.
2. **Sidebar second**: The sidebar is the most complex new component and the primary goal of this migration.
3. **Layout integration third**: Wrapping the app in SidebarProvider requires the sidebar to be ready.
4. **Component enhancement last**: Panel components can adopt shadcn primitives incrementally without blocking the sidebar migration.

### Backward Compatibility

During migration, both old and new color systems coexist:
- `bg-bg` (direct hex) and `bg-background` (CSS variable) both resolve to `#0c0b0a`
- Panel components continue using direct hex class names
- New shadcn components use CSS variable class names
- The `!important` overrides in index.css can be gradually removed as components migrate

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| shadcn CLI fails in monorepo/worktree | Manual component file creation (no CLI dependency) |
| CSS variable conflicts with existing styles | Keep both systems; CSS specificity handles conflicts |
| Bundle size increase | Only install needed components (~6 components, not the full library) |
| Tailwind class conflicts | tailwind-merge (via `cn()`) deduplicates conflicting classes |
| WorkspaceSwitcher breaks in new context | Test independently before integrating into sidebar footer |

## Data Flow

No changes to data flow. The sidebar receives the same props it does today (active section, config for counts, workspace data). The SidebarProvider adds only UI state management (open/collapsed) -- it does not touch application data.

```
App.tsx state (unchanged)
  |
  +-- AppSidebar (new wrapper)
  |     |-- SidebarHeader (logo)
  |     |-- SidebarContent (nav groups -- same data, shadcn components)
  |     +-- SidebarFooter (WorkspaceSwitcher -- same props)
  |
  +-- SidebarInset (new wrapper)
        |-- header (SidebarTrigger + search + toggle)
        +-- main (renderContent -- unchanged)
```

## Error Handling

No new error states are introduced. The sidebar migration is purely presentational. Existing error handling in App.tsx (loading states, fetch errors, SSE reconnection) is preserved without modification.
