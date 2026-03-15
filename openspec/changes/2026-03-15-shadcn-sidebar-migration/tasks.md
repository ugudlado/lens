# Tasks: Migrate Lens UI to shadcn/ui with Sidebar Layout

---

## Phase 1: Foundation (shadcn setup + theme)

### T-1: Install shadcn dependencies

- **Why**: shadcn components require class-variance-authority, clsx, tailwind-merge, lucide-react, and Radix UI primitives. These must be installed before any component can be created.
- **Files**:
  - `apps/ui/package.json` -- add dependencies
- **Verify**:
  - `pnpm install` succeeds without errors
  - `pnpm --filter @lens/ui type-check` still passes (no type conflicts)

### T-2: Configure path aliases for @/ imports

- **Why**: shadcn components use `@/` path imports (e.g., `@/lib/utils`, `@/components/ui/button`). Both TypeScript and Vite must resolve this alias.
- **Files**:
  - `apps/ui/tsconfig.json` -- add `baseUrl` and `paths` for `@/*`
  - `apps/ui/vite.config.ts` -- add `resolve.alias` for `@`
- **Verify**:
  - Create a test import `import { cn } from "@/lib/utils"` in any file -- TypeScript resolves it
  - `pnpm --filter @lens/ui type-check` passes

### T-3: Create cn() utility and components.json

- **Why**: The `cn()` function (clsx + tailwind-merge) is used by every shadcn component. The `components.json` configures shadcn for the project.
- **Files**:
  - `apps/ui/src/lib/utils.ts` -- create with `cn()` function
  - `apps/ui/components.json` -- create shadcn config
- **Verify**:
  - `cn("px-2", "px-4")` returns `"px-4"` (tailwind-merge deduplication)
  - `pnpm --filter @lens/ui type-check` passes

### T-4: Add shadcn CSS variables to theme

- **Why**: shadcn components reference HSL CSS variables (--background, --primary, --sidebar-background, etc.). These must be defined in index.css and referenced in tailwind.config.js for the existing warm amber dark theme to apply to shadcn components.
- **Files**:
  - `apps/ui/src/index.css` -- add `@layer base { :root { ... } }` block with HSL variables
  - `apps/ui/tailwind.config.js` -- add CSS variable color references, `darkMode`, `borderRadius`, and `tailwindcss-animate` plugin
- **Verify**:
  - Existing UI looks identical (no visual regression from CSS variable addition)
  - `bg-background` class resolves to the same color as `bg-bg` (#0c0b0a)
  - `text-primary` class resolves to warm amber (#c07b2e)
  - `pnpm --filter @lens/ui type-check` passes

### T-5: Install core shadcn component source files

- **Why**: The sidebar migration requires these shadcn components as local source files: sidebar, button, separator, tooltip, collapsible, dropdown-menu, sheet, input. These are copied from shadcn source (not installed via CLI to avoid monorepo issues).
- **Files**:
  - `apps/ui/src/components/ui/sidebar.tsx`
  - `apps/ui/src/components/ui/button.tsx`
  - `apps/ui/src/components/ui/separator.tsx`
  - `apps/ui/src/components/ui/tooltip.tsx`
  - `apps/ui/src/components/ui/collapsible.tsx`
  - `apps/ui/src/components/ui/dropdown-menu.tsx`
  - `apps/ui/src/components/ui/sheet.tsx`
  - `apps/ui/src/components/ui/input.tsx`
- **Verify**:
  - All files compile: `pnpm --filter @lens/ui type-check` passes
  - No unused import warnings from lint: `pnpm --filter @lens/ui lint` passes
  - Each component can be imported without errors

---

## Phase 2: Sidebar Migration

### T-6: Create nav data structure with Lucide icons

- **Why**: The current NAV_GROUPS in Sidebar.tsx uses unicode string icons. The new AppSidebar needs Lucide React component icons. Extract the nav data into a shared constant so both the sidebar and potentially the dashboard can reference it.
- **Files**:
  - `apps/ui/src/components/app-sidebar.tsx` -- create file with NAV_GROUPS using Lucide icons and NavItem type with `icon: LucideIcon`
- **Verify**:
  - All 13 nav items are present across 6 groups
  - Each item has a Lucide icon, label, and NavSection key
  - `pnpm --filter @lens/ui type-check` passes

### T-7: Build AppSidebar component

- **Why**: This is the core deliverable -- a shadcn Sidebar component that replaces the custom Sidebar.tsx. It renders the header (logo + version), nav groups with icons and count badges, and the workspace switcher in the footer.
- **Files**:
  - `apps/ui/src/components/app-sidebar.tsx` -- full implementation with SidebarHeader, SidebarContent (nav groups), SidebarFooter (WorkspaceSwitcher)
- **Verify**:
  - Component renders all 6 nav groups with correct labels
  - All 13 nav items display with Lucide icons
  - Count badges show for sections with data
  - Active item has warm amber styling (accent color + glow)
  - `pnpm --filter @lens/ui type-check` passes

### T-8: Adapt WorkspaceSwitcher for sidebar footer

- **Why**: The WorkspaceSwitcher needs to work inside SidebarFooter and handle collapsed sidebar state. In collapsed mode, it should show a compact icon; in expanded mode, the full workspace name and dropdown.
- **Files**:
  - `apps/ui/src/components/WorkspaceSwitcher.tsx` -- adapt to use `useSidebar()` hook for collapse-aware rendering
- **Verify**:
  - Expanded: shows workspace name, chevron, dropdown with search/add/remove
  - Collapsed: shows folder icon, dropdown opens on click
  - All workspace operations still work (select, add, remove, search)
  - `pnpm --filter @lens/ui type-check` passes

### T-9: Style active nav items with warm amber theme

- **Why**: shadcn's default active styling uses neutral colors. The Lens sidebar needs warm amber (#c07b2e) for active items with the existing glow effect.
- **Files**:
  - `apps/ui/src/index.css` -- add `[data-sidebar="menu-button"][data-active="true"]` overrides
  - `apps/ui/src/components/app-sidebar.tsx` -- ensure `isActive` prop is set correctly
- **Verify**:
  - Active nav item has amber background tint, amber text, right border accent, and inset glow
  - Hover states on inactive items show subtle highlight
  - Visual match with current sidebar active styling

---

## Phase 3: Layout Integration

### T-10: Wrap App.tsx in SidebarProvider + SidebarInset

- **Why**: The app layout must switch from the current `flex > aside + main` to shadcn's `SidebarProvider > AppSidebar + SidebarInset`. This enables the collapsible sidebar behavior.
- **Files**:
  - `apps/ui/src/App.tsx` -- replace layout structure, swap Sidebar for AppSidebar, wrap in SidebarProvider, use SidebarInset for main content
- **Verify**:
  - App renders with sidebar on the left, content on the right
  - SidebarTrigger collapses/expands the sidebar
  - All 13 sections navigate correctly via sidebar clicks
  - Hash-based URL navigation works (direct URL, back/forward)
  - `pnpm --filter @lens/ui type-check` passes

### T-11: Migrate header to SidebarInset pattern

- **Why**: The header (search bar + global edits toggle) needs to live inside SidebarInset's header slot. The SidebarTrigger button must be added to the header.
- **Files**:
  - `apps/ui/src/App.tsx` -- restructure header area within SidebarInset
- **Verify**:
  - SidebarTrigger button visible in header, toggles sidebar collapse
  - HeaderSearch still works, Cmd+K opens palette
  - Global edits toggle still functions
  - Header layout is clean with proper spacing

### T-12: Verify SSE, search palette, and suggestions

- **Why**: Integration testing to ensure the layout migration did not break live features. SSE events, search palette (Cmd+K), and the suggestions system must all function correctly.
- **Files**:
  - No file changes -- verification only
- **Verify**:
  - SSE: modify a config file on disk, verify the UI updates automatically
  - Search palette: Cmd+K opens, search finds items, navigation works
  - Suggestions: SuggestionsBox renders on Dashboard
  - Export/Import modals open and function correctly
  - All 12 panel components render their content without layout breaks

### T-13: Remove old Sidebar.tsx

- **Why**: The old custom Sidebar component is replaced by AppSidebar. Remove it to avoid confusion and dead code.
- **Files**:
  - `apps/ui/src/components/Sidebar.tsx` -- delete
  - `apps/ui/src/App.tsx` -- remove old Sidebar import if not already done
- **Verify**:
  - No references to old `Sidebar` component remain (except in git history)
  - `pnpm --filter @lens/ui type-check` passes
  - `pnpm --filter @lens/ui lint` passes
  - App still works correctly

---

## Phase 4: Component Enhancement (Incremental)

### T-14: Migrate shared panel UI to shadcn primitives

- **Why**: Panel components (PanelShell, PanelRow, AddButton, DeleteButton, ViewToggle, ConfirmDialog) can benefit from shadcn primitives for better consistency. This is incremental -- each sub-component can be migrated independently.
- **Files**:
  - `apps/ui/src/components/panel/PanelShell.tsx` -- use shadcn Separator for dividers
  - `apps/ui/src/components/panel/AddButton.tsx` -- use shadcn Button
  - `apps/ui/src/components/panel/DeleteButton.tsx` -- use shadcn Button variant="destructive"
  - `apps/ui/src/components/panel/ViewToggle.tsx` -- use shadcn Button group pattern
  - `apps/ui/src/components/ConfirmDialog.tsx` -- use shadcn AlertDialog (install if needed)
- **Verify**:
  - All panels render correctly with updated components
  - Button styles match warm amber theme
  - Confirm dialogs have proper focus trapping and keyboard support
  - `pnpm type-check` passes
  - `pnpm lint` passes

### T-15: Add tooltips to sidebar icons in collapsed mode

- **Why**: When the sidebar is collapsed to icon-only mode, users need tooltips to identify which section each icon represents. shadcn's SidebarMenuButton has built-in tooltip support.
- **Files**:
  - `apps/ui/src/components/app-sidebar.tsx` -- ensure `tooltip` prop is set on each SidebarMenuButton
  - `apps/ui/src/components/ui/tooltip.tsx` -- verify TooltipProvider is mounted
- **Verify**:
  - Collapse sidebar to icon mode
  - Hover over each icon -- tooltip shows the section name
  - Tooltips do not appear when sidebar is expanded (no redundancy)

### T-16: Clean up legacy CSS overrides

- **Why**: The `!important` overrides in index.css were needed because Tailwind's custom color names (`bg`, `sidebar`, `card`, `border`, `accent`) conflicted with Tailwind internals. With shadcn CSS variables in place, many of these can be simplified or removed.
- **Files**:
  - `apps/ui/src/index.css` -- audit and remove unnecessary `!important` overrides
- **Verify**:
  - Visual regression check: all pages look identical after cleanup
  - No color artifacts or missing styles
  - `pnpm --filter @lens/ui type-check` passes

---

## Task Dependencies

```
T-1 (deps) --> T-2 (aliases) --> T-3 (utils) --> T-4 (CSS vars) --> T-5 (components)
                                                                         |
                                                                         v
                                                              T-6 (nav data) --> T-7 (AppSidebar) --> T-8 (WorkspaceSwitcher)
                                                                                       |                      |
                                                                                       v                      v
                                                                                 T-9 (active styling) --> T-10 (layout wrap)
                                                                                                              |
                                                                                                              v
                                                                                                        T-11 (header) --> T-12 (verify) --> T-13 (cleanup)
                                                                                                                                               |
                                                                                                                                               v
                                                                                                                          T-14 (panel components)
                                                                                                                          T-15 (tooltips)
                                                                                                                          T-16 (CSS cleanup)
```

Phase gates:
- **Phase 1 complete**: T-1 through T-5 done, `pnpm type-check && pnpm lint` passes
- **Phase 2 complete**: T-6 through T-9 done, AppSidebar renders independently
- **Phase 3 complete**: T-10 through T-13 done, full app works with new sidebar layout
- **Phase 4 complete**: T-14 through T-16 done, incremental polish applied
