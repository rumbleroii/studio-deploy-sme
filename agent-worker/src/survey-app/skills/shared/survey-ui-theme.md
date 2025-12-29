# Survey UI Theme Specification

This document defines the exact visual theme and styling that MUST be applied to all generated surveys, regardless of the questionnaire content uploaded.

---

## Color Palette

### Primary Colors
- **Background**: `#FFFFFF` (Pure white)
- **Text Primary**: `#1A1A1A` (Near black)
- **Text Secondary**: `#666666` (Medium gray)
- **Text Tertiary**: `#999999` (Light gray)

### Accent Colors
- **Primary Accent**: `#3D1C35` (Maroon) - Used for badges, tags, and highlights
- **Secondary Accent**: `#3D1C35` (Maroon) - Used for secondary badges
- **Tertiary Accent**: `#3D1C35` (Maroon) - Used for tertiary badges
- **Warning/Info**: `#E0BFD8` (Light Maroon) - Used for show condition badges and notes background

### Border & Divider Colors
- **Border Light**: `#E0E0E0` (Very light gray)
- **Border Medium**: `#BDBDBD` (Medium gray)
- **Divider**: `#F5F5F5` (Off-white)

### Interactive States
- **Hover Background**: `#F9F9F9`
- **Selected Background**: `#FFF3F8` (Very light pink)
- **Radio/Checkbox Selected**: `#1A1A1A` (Black)
- **Radio/Checkbox Border**: `#BDBDBD`

---

## Typography

### Font Family
- **Primary Font**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Fallback**: System UI fonts for optimal performance

### Font Sizes
- **Page Title**: `32px` / `2rem` - Bold (700)
- **Section Title**: `16px` / `1rem` - Semi-bold (600)
- **Question Text**: `15px` / `0.9375rem` - Regular (400)
- **Option Text**: `14px` / `0.875rem` - Regular (400)
- **Badge Text**: `11px` / `0.6875rem` - Semi-bold (600), Uppercase
- **Note Text**: `13px` / `0.8125rem` - Regular (400)
- **Metadata Text**: `12px` / `0.75rem` - Regular (400)

### Line Heights
- **Title**: `1.2`
- **Body Text**: `1.5`
- **Question Text**: `1.6`
- **Compact Text**: `1.4`

### Font Weights
- **Bold**: `700` (Headings, Page Title)
- **Semi-bold**: `600` (Section Titles, Labels)
- **Regular**: `400` (Body text, Questions, Options)
- **Light**: `300` (Metadata, Secondary info)

---

## Spacing System

### Padding
- **Page Container**: `40px` horizontal, `32px` vertical
- **Section Container**: `24px` all sides
- **Question Container**: `20px` all sides
- **Option Padding**: `12px` vertical, `16px` horizontal
- **Badge Padding**: `4px` vertical, `8px` horizontal
- **Button Padding**: `10px` vertical, `16px` horizontal

### Margins
- **Between Sections**: `24px`
- **Between Questions**: `20px`
- **Between Options**: `8px`
- **Between List Items**: `6px`
- **After Section Title**: `12px`
- **After Question Text**: `16px`

### Gap (Flexbox/Grid)
- **Horizontal Badge Gap**: `8px`
- **Icon-Text Gap**: `8px`
- **Column Gap (Matrix)**: `16px`

---

## Border Radius

- **Cards/Containers**: `8px`
- **Question Boxes**: `8px`
- **Badges**: `4px`
- **Radio Buttons**: `50%` (Circle)
- **Checkboxes**: `3px`
- **Buttons**: `6px`
- **Input Fields**: `6px`

---

## Shadows

### Card Shadow
```css
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
```

### Hover Shadow
```css
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
```

### No Shadow
- Section containers: No shadow
- Question containers: No shadow
- Use subtle borders instead

---

## Component-Specific Styling

### Radio Buttons
- **Size**: `20px` diameter
- **Border**: `2px solid #BDBDBD`
- **Border Radius**: `50%`
- **Selected State**: Black fill with white center dot (8px diameter)
- **Hover**: Border color changes to `#999999`

### Checkboxes
- **Size**: `20px` square
- **Border**: `2px solid #BDBDBD`
- **Border Radius**: `3px`
- **Selected State**: Black fill with white checkmark
- **Hover**: Border color changes to `#999999`

### Badges/Tags
- **Background Colors**:
  - Question ID badge: `#3D1C35` (Maroon)
  - Default logic badge: `#3D1C35` (Maroon)
  - Conditional logic badge: `#3D1C35` (Maroon)
  - Dynamic options badge: `#3D1C35` (Maroon)
  - Question type badge: `#F5F5F5` (Light Gray)
- **Text Color**: `#FFFFFF` (White) for maroon badges, `#666666` (Gray) for light gray badges
- **Font**: `11px`, Semi-bold (600), Uppercase
- **Padding**: `4px 8px`
- **Border Radius**: `4px`
- **Letter Spacing**: `0.5px`

### Buttons
- **Primary Button**:
  - Background: `#1A1A1A`
  - Text: `#FFFFFF`
  - Padding: `10px 24px`
  - Border Radius: `6px`
  - Font: `14px`, Semi-bold (600)
  - Hover: Background `#333333`

- **Secondary Button**:
  - Background: `#FFFFFF`
  - Border: `1px solid #BDBDBD`
  - Text: `#1A1A1A`
  - Padding: `10px 24px`
  - Border Radius: `6px`
  - Font: `14px`, Semi-bold (600)
  - Hover: Background `#F9F9F9`

### Dropdowns (Chevron Icons)
- **Icon**: Chevron down
- **Size**: `16px`
- **Color**: `#666666`
- **Position**: Right-aligned
- **Rotation on Open**: `180deg`

### Icons
- **Eye Icon** (Show Condition):
  - Color: `#FF9800` (Orange)
  - Size: `18px`
- **Shuffle Icon** (Randomized):
  - Color: `#3D1C35` (Maroon)
  - Size: `18px`
- **Info Icons**:
  - Color: `#666666`
  - Size: `16px`

---

## Layout Structure

### Page Container
```
Max Width: 800px
Margin: 0 auto
Padding: 40px 40px
Background: #FFFFFF
```

### Section Container
```
Background: #FFFFFF
Border: 1px solid #E0E0E0
Border Radius: 8px
Padding: 24px
Margin Bottom: 24px
```

### Question Container
```
Background: #FAFAFA (Very light gray)
Border: 1px solid #E0E0E0
Border Radius: 8px
Padding: 20px
Margin Bottom: 20px
```

---

## Responsive Breakpoints

### Desktop (Default)
- **Min Width**: `1024px`
- Full layout as specified

### Tablet
- **Max Width**: `1023px`
- **Min Width**: `768px`
- Reduce horizontal padding to `24px`
- Maintain all other spacing

### Mobile
- **Max Width**: `767px`
- Reduce horizontal padding to `16px`
- Stack matrix columns vertically
- Increase touch target sizes to minimum `44px`
- Reduce font sizes by 1-2px for better fit

---

## Animation & Transitions

### Standard Transitions
```css
transition: all 0.2s ease-in-out;
```

### Hover Effects
- **Duration**: `200ms`
- **Easing**: `ease-in-out`
- **Properties**: `background-color`, `border-color`, `box-shadow`, `transform`

### Expand/Collapse
- **Duration**: `300ms`
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`

### Fade In
- **Duration**: `150ms`
- **Easing**: `ease-in`

---

## Accessibility Requirements

### Color Contrast
- **Text on White**: Minimum 4.5:1 ratio
- **Primary Text**: `#1A1A1A` - 16.1:1 ratio ✓
- **Secondary Text**: `#666666` - 5.7:1 ratio ✓

### Focus States
- **Outline**: `2px solid #3D1C35`
- **Outline Offset**: `2px`
- **Border Radius**: Match element

### Touch Targets
- **Minimum Size**: `44px × 44px`
- **Spacing**: Minimum `8px` between interactive elements

---

## Notes Section Styling

### Container
```
Background: #E0BFD8 (Light maroon)
Border Left: 4px solid #3D1C35 (Maroon)
Padding: 16px
Border Radius: 4px
Margin Top: 16px
```

### Text
- **Label**: "Notes:" - Bold (700), `13px`
- **Content**: Regular (400), `13px`
- **Color**: `#333333`
- **Line Height**: `1.6`

### List Items
- **Bullet**: Standard disc
- **Padding Left**: `20px`
- **Margin Bottom**: `4px`

---

## Matrix/Grid Question Styling

### Table Structure
- **Border**: `1px solid #E0E0E0`
- **Border Collapse**: `separate`
- **Border Spacing**: `0`

### Header Row
- **Background**: `#F5F5F5`
- **Font**: `13px`, Semi-bold (600)
- **Text Align**: Center
- **Padding**: `12px 8px`
- **Border Bottom**: `2px solid #BDBDBD`

### Data Rows
- **Background**: `#FFFFFF`
- **Alternate Row**: `#FAFAFA` (optional)
- **Border Bottom**: `1px solid #E0E0E0`
- **Padding**: `12px 8px`

### Column Headers (Attributes)
- **Font**: `13px`, Semi-bold (600)
- **Text Align**: Center
- **Padding**: `8px`

### Row Headers (Scale Points)
- **Font**: `14px`, Regular (400)
- **Text Align**: Left
- **Padding**: `12px 16px`
- **Min Width**: `200px`

### Radio Cells
- **Text Align**: Center
- **Padding**: `12px 8px`
- **Vertical Align**: Middle

---

## Implementation Notes

1. **Consistency**: Every survey generated must use these exact values
2. **No Variations**: Do not adjust colors, spacing, or typography based on content
3. **Component Reuse**: Build reusable components that enforce these styles
4. **Theme Variables**: Use CSS variables or design tokens for easy maintenance
5. **Documentation**: Reference this file in all survey generation prompts
6. **Terminology**: Use professional research language (see survey-terminology-spec.md)

---

## CSS Variables (Recommended Implementation)

```css
:root {
  /* Colors */
  --color-bg-primary: #FFFFFF;
  --color-text-primary: #1A1A1A;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-accent-primary: #3D1C35;
  --color-accent-secondary: #3D1C35;
  --color-accent-tertiary: #3D1C35;
  --color-border-light: #E0E0E0;
  --color-border-medium: #BDBDBD;
  
  /* Typography */
  --font-size-title: 2rem;
  --font-size-section: 1rem;
  --font-size-question: 0.9375rem;
  --font-size-option: 0.875rem;
  --font-size-badge: 0.6875rem;
  --font-size-note: 0.8125rem;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 40px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-full: 50%;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}
```

