# FocusTap Design System

## 1. Atmosphere & Identity

A quiet command center that drifts in and out of view — summoned by keystroke, dismissed by instinct. The signature is **ethereal glass on OLED darkness**: surfaces are translucent layers that catch light like frosted crystal, separated not by borders but by depth of blur and subtle luminance shifts. The purple accent isn't a brand color — it's a momentary glow, like a neon sign reflected in wet glass. The app doesn't feel opened; it feels *summoned*.

## 2. Color

### Palette

| Role | Token | Dark (Current) | Usage |
|------|-------|----------------|-------|
| Surface/deepest | --surface-deep | `#050505` | Page background, canvas |
| Surface/primary | --surface-primary | `#0a0a0a` | Main app surface (glass base) |
| Surface/secondary | --surface-secondary | `#0f0f0f` | Panels, card backgrounds |
| Surface/elevated | --surface-elevated | `rgba(255,255,255,0.04)` | Elevated glass — hover states |
| Surface/glass | --surface-glass | `rgba(255,255,255,0.03)` | Glass cards, translucent containers |
| Surface/glass-edge | --surface-glass-edge | `rgba(255,255,255,0.06)` | Glass with stronger edge presence |
| Text/primary | --text-primary | `#f0f0f0` | Headlines, primary body |
| Text/secondary | --text-secondary | `#a0a0a0` | Body, descriptions |
| Text/tertiary | --text-tertiary | `#666666` | Placeholders, metadata |
| Text/quaternary | --text-quaternary | `#444444` | Disabled, de-emphasized |
| Accent/primary | --accent-primary | `#8b7eff` | CTAs, active states, brand glow |
| Accent/hover | --accent-hover | `#a599ff` | Hover state on accent elements |
| Accent/subtle | --accent-subtle | `rgba(139,126,255,0.15)` | Subtle accent bg, glow effects |
| Accent/glow | --accent-glow | `rgba(139,126,255,0.08)` | Background aura/glow |
| Border/subtle | --border-subtle | `rgba(255,255,255,0.04)` | Whisper-thin separation |
| Border/default | --border-default | `rgba(255,255,255,0.07)` | Card borders, inputs |
| Border/strong | --border-strong | `rgba(255,255,255,0.10)` | Focus rings, prominent edges |
| Status/success | --status-success | `#22c55e` | Completion, active indicators |
| Overlay | --overlay-bg | `rgba(0,0,0,0.7)` | Settings backdrop |

### Rules
- Purple accent is **not decorative** — it appears only on interactive elements, active states, and the brand mark.
- Surface hierarchy is created through **background opacity steps** (`rgba(white, 0.02 → 0.04 → 0.06)`) and **blur depth**, not borders.
- Never introduce a color not in this table. Extend the table first.
- Glass surfaces use `backdrop-blur` only on fixed/non-scrolling elements.

## 3. Typography

### Font Stack
- **Primary**: `"Inter Variable", "Inter", system-ui, -apple-system, sans-serif`
- **OpenType Features**: `"cv01", "ss03"` enabled globally on ALL text (single-story 'a', geometric alternates)

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Display | 28px / 1.75rem | 510 | 1.1 | -0.015em | App title, big numbers |
| H2 | 16px / 1rem | 510 | 1.3 | -0.01em | Section headers |
| Body | 14px / 0.875rem | 400 | 1.5 | normal | Task text, body content |
| Body/mono | 14px / 0.875rem | 510 | 1.4 | normal | Keyboard shortcut labels |
| Small | 13px / 0.8125rem | 400 | 1.5 | normal | Secondary info |
| Caption | 12px / 0.75rem | 500 | 1.4 | 0.02em | Metadata, timestamps |
| Micro | 11px / 0.6875rem | 510 | 1.3 | 0.04em | Overline, status labels |
| Tiny | 10px / 0.625rem | 400 | 1.3 | 0.02em | Progress hint text |

### Rules
- The 510 weight (between regular and medium) is the signature emphasis weight. Use it for all UI labels, headers, and interactive text.
- Never use weight 700. Maximum is 590 (semibold), used only for strong emphasis.
- Font-feature-settings `"cv01", "ss03"` on every text element — this is non-negotiable for the brand look.
- Body text never below 12px.

## 4. Spacing & Layout

### Base Unit
All spacing derives from a base of **4px**.

| Token | Value | Usage |
|-------|-------|-------|
| --space-1 | 4px | Icon-to-label gap |
| --space-2 | 8px | Compact: list items, inline groups |
| --space-3 | 12px | Default: form field padding |
| --space-4 | 16px | Standard: card padding |
| --space-5 | 20px | Comfortable: section inner spacing |
| --space-6 | 24px | Generous: card group spacing |
| --space-8 | 32px | Separated: between sections |
| --space-10 | 40px | Major section breaks |

### Window
- Default size: 420×520 (unchanged)
- Decorations: false (custom chrome)
- Always on top: true
- Border radius: 16px outer window, 14px inner content

### Rules
- No magic numbers. Every spacing value maps to a token.
- Asymmetric spacing is intentional, not accidental.

## 5. Components

### App Shell (Window Frame)
- **Structure**: `div.outer-shell` > `div.inner-core` > header + main
- **Double-Bezel Architecture**:
  - Outer shell: `bg-[#050505]`, `rounded-[16px]`, `p-[1.5px]`
  - Inner core: `bg-[#0a0a0a]`, `rounded-[14px]`, inset highlight `shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`
- **Spacing**: Outer shell padding 1.5px, inner content `p-4`
- **States**: N/A (static frame)
- **Accessibility**: `data-tauri-drag-region` on header for window drag
- **Motion**: Window show/hide managed by Tauri (fade and scale)

### Header
- **Structure**: `div.flex` with drag region, brand icon, title, settings button
- **Spacing**: `px-5 pt-4 pb-2` (top padding accounts for window radius)
- **Components**:
  - Brand mark: Glass circle with purple dot (8px purple circle with glow)
  - Title: "FocusTap" in `text-xs weight-510 tracking-wide uppercase text-secondary`
  - Settings button: Ghost icon button, `text-tertiary hover:text-primary`
- **States**: N/A (static region)

### TaskInput
- **Structure**: `div` > glass-background input container
- **Glass input**: `bg-white/3` background, `border-white/7` border, `rounded-[10px]`, `text-primary` placeholder
- **Focus state**: `border-accent/30`, `shadow-[0_0_0_1px_rgba(139,126,255,0.15)]`, `bg-white/5`
- **Add button** (when text present): Pill button `bg-accent-primary hover:bg-accent-hover`, `rounded-full`, `px-3 py-1.5`, nested position right inset
  - Hover: subtle scale `active:scale-[0.97]`
- **Keyboard hint**: `text-[10px] text-quaternary text-center` below input
- **Spacing**: Input `px-4 py-2.5`, hint `mt-1.5`
- **Motion**: Focus ring transitions at 150ms ease-out
- **States**: default, focus, active (typing), disabled

### TaskList
- **Structure**: `div.flex-col` > progress bar section + task items list
- **Progress bar**: `h-[3px] bg-white/5 rounded-full overflow-hidden`
  - Fill: `bg-accent-primary` with gradient edge, `transition-all duration-500 ease-out`
  - Label row: "Today's progress" on left, "done/total" on right
- **Streak indicator**: `text-[11px] text-accent-primary/60` with sparkle icon
- **Task item**: Glass card `bg-white/[0.02] hover:bg-white/[0.05]` `rounded-[8px]` `px-3 py-2`
  - Double-bezel micro: subtle inner shadow on hover
  - Entry animation: `slideIn` (translateY 4px + opacity, 200ms ease-out, staggered)
- **Checkbox**: `w-[18px] h-[18px] rounded-full border-2` 
  - Default: `border-white/15 hover:border-accent/40`
  - Checked: `bg-accent-primary border-accent-primary` with white checkmark
  - Animation: 200ms ease-out scale bounce on check
- **Text**: Editable inline — clicking switches to input mode
  - Default: `text-sm font-normal text-primary`
  - Done: `line-through text-tertiary`
  - Editing: `border-b border-accent/30 bg-transparent`
- **Delete button**: `opacity-0 group-hover:opacity-100`, `text-tertiary hover:text-red-400`, `transition-all duration-150`
- **Empty state**: Centered `flex-col` with Inbox icon `text-tertiary/30`, "No tasks yet" `text-secondary/60`, hint `text-tertiary/40`
- **Accessibility**: Click to edit, Enter to save, Escape to cancel. Toggle via checkbox click.
- **Motion**: Task items fade-slide in on add, fade out on delete (future), checkmark bounce on toggle

### SettingsPanel
- **Structure**: Fixed overlay (`inset-0 z-50`) > backdrop + slide-in panel
- **Backdrop**: `bg-black/70 backdrop-blur-sm`, click to close
- **Panel**: Slide-in from right, `w-[280px] h-full`, glass surface `bg-[#0c0c0c]/95 backdrop-blur-xl`, `rounded-l-[14px] border-l border-white/5`
- **Header**: Title "Settings" + close X button, bottom border `border-white/5`
- **Rows**: Icon + label + control, `py-3` spacing
  - Auto-start: Toggle switch + description
  - Sound: Toggle switch + description  
  - Shortcut: Display-only badge `text-xs font-mono bg-white/5 px-2 py-1 rounded-md`
- **Toggle switch**: `w-[36px] h-[20px] rounded-full bg-white/10`
  - Checked: `bg-accent-primary`
  - Thumb: `w-[16px] h-[16px] rounded-full bg-white shadow-sm`
  - Animation: `translate-x-[16px]` on checked, 200ms ease-out
- **Motion**: Panel slides from right (translateX 100% → 0), backdrop fades in, both 200ms ease-out
- **Accessibility**: Esc to close, focus trap inside panel, aria-labels on toggles

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100-150ms | ease-out | Button press, toggle, focus ring |
| Standard | 200-300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Panel slide, task entry, backdrop |
| Emphasis | 400-600ms | `cubic-bezier(0.32, 0.72, 0, 1)` | Checkmark bounce, streak glow |
| Task entry | 200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Individual task item appear |

### Custom Easing Curves
- **Ease-Out-Expo**: `cubic-bezier(0.16, 1, 0.3, 1)` — for sliding panels, task entries, backdrop fades
- **Spring-Light**: `cubic-bezier(0.32, 0.72, 0, 1)` — for playful elements (checkmark, streak)
- **Ease-Out**: `cubic-bezier(0, 0, 0.2, 1)` — for hover states, micro-interactions

### Interaction Rules
- Every interactive element has hover + active + focus states
- Only animate `transform` and `opacity`. Never animate layout properties.
- Magnetic buttons: subtle scale on hover (`scale-[1.02]`), press-down on active (`scale-[0.97]`)
- Slop animation is forbidden — every animation serves an interaction or state change
- Respect `prefers-reduced-motion`: disable all non-essential animations

### Entry Animations
- Task items: fade-up + slide-up (`opacity 0 → 1`, `translateY 6px → 0`), 200ms, staggered by index * 30ms
- Settings panel: slide from right, 200ms ease-out-expo
- Backdrop: fade-in, 150ms ease-out

## 7. Depth & Surface

### Strategy: **Tonal-Shift + Glass**

Surfaces are distinguished by **background opacity** (luminance stepping) and **backdrop blur**, not borders or shadows.

| Level | Background | Blur | Border | Usage |
|-------|------------|------|--------|-------|
| Deepest | `#050505` | — | — | Window outer shell, canvas |
| Primary | `#0a0a0a` | — | — | Main surface |
| Glass | `rgba(255,255,255,0.03)` | `blur-xl` | `rgba(255,255,255,0.04)` | Cards, containers |
| Elevated | `rgba(255,255,255,0.05)` | `blur-2xl` | `rgba(255,255,255,0.07)` | Settings panel, hover states |
| Accent glow | `rgba(139,126,255,0.08)` | `blur-3xl` | — | Behind brand mark, active states |

### Rules
- Borders are **ultra-thin semi-transparent white** — never solid dark colors on dark backgrounds.
- The inset highlight technique: `box-shadow: inset 0 1px 0 rgba(255,255,255,0.06)` on inner cores creates a subtle bevel effect.
- Apply `backdrop-blur` only to fixed/overlay elements (settings panel, glass containers). Never on scrolling content.

### Glass Materials

**Standard Glass** (cards, containers):
```
background: rgba(255, 255, 255, 0.03)
border: 1px solid rgba(255, 255, 255, 0.04)
border-radius: 8px
backdrop-filter: blur(16px)
```

**Elevated Glass** (settings panel, overlays):
```
background: rgba(15, 15, 15, 0.95)
border: 1px solid rgba(255, 255, 255, 0.07)
border-radius: 14px
backdrop-filter: blur(24px)
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06)
```
