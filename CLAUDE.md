# Ticks Project Guidelines

## Package Management

- Use `pnpm` for all JavaScript/TypeScript projects (not npm or yarn)
- UI is in `internal/tickboard/ui/` - run `pnpm install` and `pnpm test` there

## UI Components

- Use native ticks-* components (ticks-button, ticks-input, ticks-dialog, ticks-alert, etc.) instead of browser built-ins
- Never use `confirm()`, `alert()`, or `prompt()` - use ticks-dialog and ticks-alert components instead
- All custom events must have `bubbles: true, composed: true` to cross shadow DOM boundaries
- Form submission in shadow DOM requires manual handling - buttons with type="submit" must call `form.requestSubmit()` explicitly

## Design System

- Follow Catppuccin Mocha color palette (defined in CSS variables)
- Use Geist Sans for body text, Geist Mono for code
- Primary color is green (#a6e3a1)

## Ticks Skill

The distributable skill lives in `skills/ticks/` — this is the source of truth. It covers tracker use and authoring; running epics is ticfac's (github.com/pengelbrecht/ticfac). Always edit files under `skills/ticks/`, never an installed copy under a user home directory.
