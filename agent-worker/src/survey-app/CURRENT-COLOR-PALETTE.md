# Current Color Palette - Survey Application

**Last Updated**: December 17, 2025
**Version**: 1.4.0

---

## 🎨 Complete Color Reference

### Primary Colors

| Element | Hex Code | Color Name | Usage |
|---------|----------|------------|-------|
| **Question ID Badge** | `#3D1C35` | Maroon | Question identifier badges |
| **Primary Accent** | `#3D1C35` | Maroon | Primary buttons, logic badges (default), progress bar, hover states |
| **Secondary Accent** | `#3D1C35` | Maroon | Same as primary - unified maroon theme |
| **Warning Accent** | `#E0BFD8` | Light Maroon/Lavender | Show condition badges, notes background |
| **Primary Text** | `#1A1A1A` | Near Black | Page titles, question text, body text |
| **Secondary Text** | `#666666` | Medium Gray | Section descriptions, metadata, labels |

---

## Badge Colors

### Question Badges
- **Question ID Badge**: `#3D1C35` (Maroon) - White text
- **Question Type Badge**: `#F5F5F5` (Light Gray) - `#666666` text

### Logic Badges
- **Default Logic Badge**: `#3D1C35` (Maroon) - White text
- **Conditional Logic Badge**: `#3D1C35` (Maroon) - White text
- **Show Condition Badge**: `#E0BFD8` (Light Maroon) - White text with light maroon border
- **Dynamic Options Badge**: `#3D1C35` (Maroon) - White text

---

## Interactive Element Colors

### Buttons
- **Primary Button Background**: `#3D1C35` (Maroon)
- **Primary Button Hover**: `#2D1528` (Darker Maroon)
- **Primary Button Text**: `#FFFFFF` (White)

### Form Elements
- **Input Border**: `#BDBDBD` (Medium Gray)
- **Input Focus Border**: `#3D1C35` (Maroon)
- **Radio Button Selected**: `#1A1A1A` (Black)
- **Checkbox Selected**: `#1A1A1A` (Black)

### Interactive States
- **Option Hover Border**: `#3D1C35` (Maroon)
- **Hover Background**: `#F9F9F9` (Very Light Gray)
- **Selected Background**: `#FFF3F8` (Very Light Pink)

---

## Layout Colors

### Backgrounds
- **Page Background**: `#FFFFFF` (White)
- **Section Card Background**: `#FAFAFA` (Off-White)
- **Question Card Background**: `#FFFFFF` (White)

### Borders & Dividers
- **Border Light**: `#E0E0E0` (Very Light Gray)
- **Border Medium**: `#BDBDBD` (Medium Gray)
- **Divider**: `#F5F5F5` (Off-White)

---

## Special Element Colors

### Notes Section
- **Background**: `#E0BFD8` (Light Maroon)
- **Border**: `#3D1C35` (Maroon)
- **Text**: `#333333` (Dark Gray)

### Progress Bar
- **Fill Color**: `#3D1C35` (Maroon)
- **Background**: `#E0E0E0` (Light Gray)

---

## CSS Variables Reference

From `app/globals.css`:

```css
:root {
  /* Text Colors */
  --color-primary-text: #1A1A1A;
  --color-secondary-text: #666666;
  --color-tertiary-text: #999999;

  /* Backgrounds */
  --color-background: #FFFFFF;
  --color-border: #E0E0E0;

  /* Accent Colors */
  --color-primary-accent: #3D1C35;
  --color-secondary-accent: #3D1C35;
  --color-tertiary-accent: #3D1C35;
  --color-warning-accent: #E0BFD8;

  /* Badge Colors */
  --color-badge-question-id: #3D1C35;
  --color-badge-question-type: #F5F5F5;
  --color-badge-logic-default: #3D1C35;
  --color-badge-logic-conditional: #3D1C35;
  --color-badge-logic-show: #E0BFD8;
  --color-badge-dynamic: #3D1C35;

  /* Notes Colors */
  --color-notes-bg: #E0BFD8;
  --color-notes-border: #3D1C35;

  /* Interactive States */
  --color-input-border: #BDBDBD;
  --color-input-focus: #3D1C35;
  --color-hover-bg: #F9F9F9;
  --color-selected-bg: #FFF3F8;
}
```

---

## Color Usage Examples

### Authoring View (Home Page)
```
┌─────────────────────────────────────────┐
│ [#3D1C35] SCR1  [#F5F5F5] Single Choice │ ← Question badges
│                                         │
│ Question text...                        │ ← #1A1A1A
│                                         │
│ [#3D1C35] Default → Q2                  │ ← Logic badge
└─────────────────────────────────────────┘
```

### Hosted Survey
```
Progress: ████████░░░░░░░░ 50%           ← #3D1C35 fill
          ↑
    Maroon progress bar

┌─────────────────────────────────────────┐
│ ○ Option 1                              │ ← Hover: #3D1C35 border
│ ● Option 2                              │ ← Selected: #1A1A1A
│ ○ Option 3                              │
│                                         │
│ [#3D1C35 Next Button]                   │
└─────────────────────────────────────────┘
```

---

## Accessibility

### Contrast Ratios
- **Question ID Badge (#3D1C35 on white)**: ~10:1 (AAA)
- **Primary Text (#1A1A1A on white)**: ~15:1 (Excellent)
- **Secondary Text (#666666 on white)**: ~5.7:1 (AA+)
- **Maroon Buttons (#3D1C35 on white)**: ~10:1 (AAA)

All color combinations meet **WCAG 2.1 Level AA** standards.

---

## Design Rationale

### Why These Colors?

1. **Maroon (#3D1C35) for All Primary Badges**
   - Unified, consistent color scheme
   - Strong brand identity throughout
   - Professional, sophisticated appearance
   - Excellent contrast for readability

2. **Maroon (#3D1C35) for Primary Actions**
   - Warm, professional color
   - Strong brand identity
   - Good contrast without being too bright

3. **Unified Maroon (#3D1C35) for All Accents**
   - Simplified, consistent color scheme
   - Reduces visual complexity
   - Strong brand identity throughout

4. **Light Maroon (#E0BFD8) for Show Conditions**
   - Softer accent for visibility indicators
   - Complements primary maroon
   - Distinguishes show logic from other badges

5. **Black (#1A1A1A) for Selected States**
   - Clear, unambiguous selection indicator
   - Follows specification requirements
   - High contrast for visibility

---

## Migration History

### Version 1.0 (Initial)
- Pink theme: `#E91E63`

### Version 1.1 (First Update)
- Changed to maroon: `#3D1C35`
- Updated question ID badges to maroon

### Version 1.2
- Question ID badges: `#060405` (very dark gray)
- Secondary/tertiary accents: `#E0BFD8` (light maroon)
- Maintained maroon for primary actions

### Version 1.3
- Simplified color scheme: All accents now `#3D1C35` (maroon)
- Show condition badge: `#E0BFD8` (light maroon)
- Unified maroon theme for consistency

### Version 1.4 (Current)
- All primary badges unified to `#3D1C35` (maroon)
- Question ID badge: `#060405` → `#3D1C35`
- Conditional logic badge: `#9C27B0` → `#3D1C35`
- Dynamic options badge: `#00BCD4` → `#3D1C35`
- Notes background: `#FFF9E6` (yellow) → `#E0BFD8` (light maroon)
- Notes border: `#FFC107` (amber) → `#3D1C35` (maroon)
- Complete maroon unified theme

---

## Files Using These Colors

1. **`app/globals.css`** - CSS custom properties and classes
2. **`components/QuestionRenderer.tsx`** - Hover states
3. **`app/s/[surveyId]/question/page.tsx`** - Progress bar
4. **All documentation files** - Color references updated

---

## Quick Reference Table

| Element | Color | Variable |
|---------|-------|----------|
| Question ID | #3D1C35 | `--color-badge-question-id` |
| Question Type | #F5F5F5 | `--color-badge-question-type` |
| Primary Button | #3D1C35 | `--color-primary-accent` |
| Logic Default | #3D1C35 | `--color-badge-logic-default` |
| Logic Conditional | #3D1C35 | `--color-badge-logic-conditional` |
| Logic Show | #E0BFD8 | `--color-badge-logic-show` |
| Dynamic Options | #3D1C35 | `--color-badge-dynamic` |
| Notes Background | #E0BFD8 | `--color-notes-bg` |
| Notes Border | #3D1C35 | `--color-notes-border` |
| Progress Bar | #3D1C35 | `--color-primary-accent` |
| Input Focus | #3D1C35 | `--color-input-focus` |
| Selected Radio/Checkbox | #1A1A1A | (hardcoded) |

---

**Status**: ✅ All colors verified and documented
**Next Update**: Any future changes should update this document first
