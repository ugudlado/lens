# Spec: Migrate Lens UI to shadcn/ui with Sidebar Layout

## Motivation

Lens currently uses fully custom Tailwind components for all UI elements -- sidebar navigation, buttons, dropdowns, modals, and panel layouts. While functional, this approach has compounding costs:

1. **Accessibility gaps**: Custom sidebar, dropdowns (WorkspaceSwitcher), and modals lack proper ARIA roles, keyboard navigation, and focus management. Each requires manual implementation.
2. **No collapsible sidebar**: The current 208px fixed sidebar cannot collapse. On smaller screens or when users want more content space, there is no way to minimize it. shadcn's Sidebar component provides icon-collapse mode out of the box.
3. **Inconsistent component quality**: Each interactive element (toggle, dropdown, dialog) is hand-built with slightly different patterns. A shared component library normalizes behavior.
4. **Maintenance burden**: Custom components require ongoing maintenance for edge cases (focus trapping, scroll locking, animation). shadcn components handle these correctly by default.

shadcn/ui is the right choice because it is Tailwind-native (no CSS-in-JS), uses Radix UI primitives for accessibility, generates local source files (not a black-box dependency), and is designed for exactly this kind of dark-themed dashboard.

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Sidebar displays all 6 nav groups (Overview, Instructions, Capabilities, Integrations, Policy, Sandbox) with the same 13 items | Must |
| FR-2 | Sidebar collapses to icon-only mode via SidebarTrigger toggle | Must |
| FR-3 | Nav items show count badges from ConfigSnapshot data | Must |
| FR-4 | Active nav item has visual indicator (accent color highlight + glow) | Must |
| FR-5 | Workspace switcher remains functional (select, add, remove, search) | Must |
| FR-6 | Hash-based navigation (pushState/popstate) continues to work | Must |
| FR-7 | SSE live reload continues to function | Must |
| FR-8 | Search palette (Cmd+K) continues to work | Must |
| FR-9 | Global edits toggle in header continues to work | Must |
| FR-10 | Export/Import modals continue to work | Must |
| FR-11 | All 12 panel components render correctly in the new layout | Must |
| FR-12 | Dashboard overview with card groups renders correctly | Must |
| FR-13 | Lucide React icons replace unicode characters in nav items | Should |
| FR-14 | Sidebar header shows app name + version | Must |
| FR-15 | Tooltips on sidebar items when collapsed to icon mode | Should |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF-1 | Maintain the existing dark theme: bg #0c0b0a, sidebar #100f0e, card #161412, border #252220, accent #c07b2e |
| NF-2 | Maintain Geist font family |
| NF-3 | No increase in initial bundle size beyond shadcn component weight (~15-20KB gzipped for sidebar + utilities) |
| NF-4 | Tailwind v3 compatibility (no Tailwind v4 migration in this feature) |
| NF-5 | All existing panel components must work without modification to their internal content |
| NF-6 | Type-check must pass (`pnpm type-check`) |
| NF-7 | Lint must pass (`pnpm lint`) |

## Non-Goals

- **No backend changes**: Server, scanner, and API routes are untouched.
- **No new features**: This is a UI component migration, not a feature addition.
- **No router library**: Navigation remains useState + hash-based.
- **No Tailwind v4 migration**: Stay on Tailwind v3.
- **No full panel redesign**: Panel internals (PanelShell, PanelRow, etc.) are migrated incrementally in Phase 4 only. Phases 1-3 focus on sidebar + layout.
- **No mobile responsive design**: Collapsible sidebar improves space usage but full mobile layout is out of scope.

## Scope

### Files Modified

| File | Change |
|------|--------|
| `apps/ui/package.json` | Add shadcn dependencies (tailwindcss-animate, class-variance-authority, clsx, tailwind-merge, lucide-react, @radix-ui/*) |
| `apps/ui/tailwind.config.js` | Add shadcn CSS variable references, tailwindcss-animate plugin |
| `apps/ui/src/index.css` | Add shadcn CSS variables mapped to current theme colors |
| `apps/ui/tsconfig.json` | Add path alias for `@/` if needed by shadcn |
| `apps/ui/vite.config.ts` | Add path alias resolution for `@/` |
| `apps/ui/src/App.tsx` | Wrap layout in SidebarProvider + SidebarInset, update header |
| `apps/ui/src/components/Sidebar.tsx` | Replace with AppSidebar using shadcn Sidebar components |
| `apps/ui/src/components/WorkspaceSwitcher.tsx` | Adapt for shadcn SidebarFooter context |

### Files Created

| File | Purpose |
|------|---------|
| `apps/ui/src/lib/utils.ts` | shadcn `cn()` utility (clsx + tailwind-merge) |
| `apps/ui/src/components/ui/sidebar.tsx` | shadcn Sidebar component source |
| `apps/ui/src/components/ui/button.tsx` | shadcn Button component |
| `apps/ui/src/components/ui/separator.tsx` | shadcn Separator component |
| `apps/ui/src/components/ui/tooltip.tsx` | shadcn Tooltip component |
| `apps/ui/src/components/ui/collapsible.tsx` | shadcn Collapsible component |
| `apps/ui/src/components/ui/dropdown-menu.tsx` | shadcn DropdownMenu for workspace switcher |
| `apps/ui/src/components/ui/sheet.tsx` | shadcn Sheet (mobile sidebar drawer) |
| `apps/ui/src/components/ui/input.tsx` | shadcn Input component |
| `apps/ui/components.json` | shadcn configuration file |
| `apps/ui/src/components/app-sidebar.tsx` | New AppSidebar component |

### Files Unchanged

All 12 panel components, Dashboard.tsx internals, SearchPalette, HeaderSearch, server code, schema package.

## Acceptance Criteria

1. Sidebar renders with all 13 nav items across 6 groups, matching current grouping
2. Clicking SidebarTrigger collapses sidebar to icon-only mode and expands it back
3. Count badges display correctly for all sections with data
4. Active section is visually indicated with warm amber accent
5. Workspace switcher dropdown works (select, search, add, remove)
6. Hash-based navigation works (direct URL, back/forward buttons)
7. SSE config-changed events trigger re-renders
8. Cmd+K opens search palette
9. Global edits toggle functions correctly
10. Theme matches current dark amber aesthetic (no visible color regression)
11. `pnpm type-check` passes
12. `pnpm lint` passes
