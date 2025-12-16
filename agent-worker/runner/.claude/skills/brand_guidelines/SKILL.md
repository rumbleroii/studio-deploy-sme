---
name: brand-guidelines
description: Metaforms.ai brand guidelines for consistent UI design. Reference this when building user interfaces.
---

# Metaforms Brand Guidelines

Use these guidelines when building user interfaces to maintain consistent Metaforms branding.

## Color Palette

### Primary Colors

| Name              | Hex       | Usage                                                                                   |
| ----------------- | --------- | --------------------------------------------------------------------------------------- |
| **Coral**         | `#FF6E4D` | Primary actions, CTAs, highlights, links                                                |
| **White**         | `#FFFFFF` | Main background for all screens and surfaces                                            |
| **Deep Burgundy** | `#3D1C35` | Used as a dark background for components like navbar, modals, dark sections/cards, etc. |

### Coral Scale (Tailwind)

- `coral-50`: #FFF0ED (lightest - subtle backgrounds)
- `coral-100`: #FFE1DB
- `coral-200`: #FFC3B7
- `coral-300`: #FFA593
- `coral-400`: #FF876F
- `coral-500`: #FF6E4D (primary - buttons, links)
- `coral-600`: #FF3D14 (hover states)
- `coral-700`: #DA2600
- `coral-800`: #A21C00
- `coral-900`: #6A1200 (darkest)

### Burgundy Scale (Tailwind)

- `burgundy-50`: #9B4A85 (lightest)
- `burgundy-100`: #8F4479
- `burgundy-200`: #783A66
- `burgundy-300`: #613053
- `burgundy-400`: #4F2644 (cards, elevated surfaces)
- `burgundy-500`: #3D1C35 (primary - dark background)
- `burgundy-600`: #2B1426 (darker sections)
- `burgundy-700`: #190C16
- `burgundy-800`: #070407
- `burgundy-900`: #000000 (darkest)

## Typography

### Font Families

| Font              | Usage                                        | Fallbacks             |
| ----------------- | -------------------------------------------- | --------------------- |
| **BR Cobane**     | Primary sans-serif - headings, body text, UI | system-ui, sans-serif |
| **Messina Serif** | Accent italic - quotes, emphasis             | Georgia, serif        |

### Font Sizes

- `text-xs`: 12px - Labels, captions
- `text-sm`: 14px - Secondary text
- `text-base`: 16px - Body text (default)
- `text-lg`: 18px - Lead paragraphs
- `text-xl`: 20px - Section headings
- `text-2xl`: 24px - Page titles
- `text-3xl`: 30px - Hero headings

## Design Principles

1. **Glass Morphism** - Semi-transparent surfaces with backdrop blur
2. **Generous Whitespace** - Let content breathe
3. **Subtle Animations** - Smooth 200-300ms transitions

## Component Patterns

### Buttons

```jsx
// Primary
<button className="bg-coral hover:bg-coral-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">
  Action
</button>

// Secondary
<button className="bg-burgundy-400 hover:bg-burgundy-300 text-white font-medium py-2 px-4 rounded-lg border border-coral/30">
  Secondary
</button>
```

### Cards

```jsx
<div className="bg-burgundy-400/50 backdrop-blur-sm rounded-xl border border-white/10 p-6">
	<h3 className="text-xl font-semibold mb-2">Title</h3>
	<p className="text-white/70">Content</p>
</div>
```

### Inputs

```jsx
<input
	className="bg-burgundy-600 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-coral focus:ring-1 focus:ring-coral"
	placeholder="Enter text..."
/>
```

### Text Styles

```jsx
// Heading
<h1 className="text-3xl font-bold text-white">Heading</h1>

// Body
<p className="text-base text-white/80">Body text</p>

// Muted
<span className="text-sm text-white/50">Helper text</span>

// Link
<a className="text-coral hover:text-coral-400 underline">Link</a>
```

## Layout

### Page Container

```jsx
<main className="min-h-screen bg-burgundy p-8">
	<div className="max-w-4xl mx-auto">{/* Content */}</div>
</main>
```

### Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	{/* Cards */}
</div>
```

## CSS Variables

```css
:root {
	--color-coral: #ff6e4d;
	--color-burgundy: #3d1c35;
}
```

## Pre-built Classes

The webapp template includes:

- `.btn-primary` - Coral button
- `.btn-secondary` - Burgundy outlined button
- `.card` - Glass-effect container
- `.input` - Styled form input
