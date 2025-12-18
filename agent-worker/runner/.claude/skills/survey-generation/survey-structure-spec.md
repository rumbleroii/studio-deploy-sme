# Survey Structure Specification

This document defines the exact structural hierarchy and layout that MUST be applied to all generated surveys.

**Reference**: This spec works in conjunction with `../shared/survey-ui-theme.md` for styling details.

---

## Document Hierarchy

```
Survey Document
├── Header Section
│   ├── Project Name (Title)
│   ├── Objectives Section
│   └── Audience Section
└── Questionnaire Section
    ├── Section 1
    │   ├── Section Header
    │   └── Questions
    ├── Section 2
    │   ├── Section Header
    │   └── Questions
    └── Section N...
```

---

## 1. Header Section

### 1.1 Project Name
- **Element**: H1 heading
- **Position**: Top of document
- **Styling**: 
  - Font size: `32px`
  - Font weight: `700` (Bold)
  - Color: `#1A1A1A`
  - Margin bottom: `32px`
- **Content**: The survey/project title
- **Example**: "Project Name"

### 1.2 Objectives Section
- **Element**: Section container
- **Structure**:
  ```
  Objectives (H2)
  └── Bulleted List
      ├── Objective 1
      ├── Objective 2
      ├── Objective 3
      └── Objective N...
  ```
- **Styling**:
  - Section title: `16px`, Semi-bold (600)
  - List items: `14px`, Regular (400), Color: `#666666`
  - Bullet style: Standard disc
  - Margin bottom: `24px`

### 1.3 Audience Section
- **Element**: Section container
- **Structure**:
  ```
  Audience (H2)
  ├── Sample Size (N) = [number]
  └── Quotas:
      ├── Quota 1 Split
      ├── Quota 2 Split
      └── Quota N...
  ```
- **Styling**:
  - Section title: `16px`, Semi-bold (600)
  - Content: `14px`, Regular (400), Color: `#666666`
  - Nested list for quotas
  - Margin bottom: `32px`

---

## 2. Questionnaire Section

### 2.1 Section Header
- **Element**: Collapsible section header
- **Structure**:
  ```
  [Section Icon] Section N: [Section Name]     [Question Count] [Chevron]
  [Section Description]
  ```

- **Components**:
  - **Section Number**: "Section 1:", "Section 2:", etc.
  - **Section Name**: Descriptive title (e.g., "Introduction", "Screener")
  - **Question Count**: "1 Question", "5 Questions", etc.
  - **Chevron Icon**: Down arrow (▼) when collapsed, up arrow (▲) when expanded
  - **Description**: Optional subtitle below section name

- **Styling**:
  - Background: `#FFFFFF`
  - Border: `1px solid #E0E0E0`
  - Border radius: `8px`
  - Padding: `16px 24px`
  - Margin bottom: `16px`
  - Font: `16px`, Semi-bold (600)
  - Color: `#1A1A1A`
  - Description: `14px`, Regular (400), Color: `#666666`

- **Interactive States**:
  - Hover: Background `#F9F9F9`
  - Cursor: `pointer`
  - Transition: `200ms ease-in-out`

### 2.2 Section Content (Expanded)
- **Container**:
  - Background: `#FAFAFA`
  - Border: `1px solid #E0E0E0` (continues from header)
  - Border top: None (connected to header)
  - Border radius: `0 0 8px 8px` (bottom corners only)
  - Padding: `24px`

---

## 3. Question Structure

### 3.1 Question Container
Every question MUST follow this structure:

```
Question Container
├── Question Header
│   ├── Question ID Badge
│   ├── Question Type Badge
│   └── Question Text
├── Question Options/Input Area
├── Metadata Row (Optional)
│   ├── Default Badge
│   ├── Logic Badges
│   ├── Randomization Badge
│   └── Condition Badge
└── Notes Section (Optional)
```

### 3.2 Question Header

#### Question ID Badge
- **Format**: "INTRO1", "SCR1", "Q1", etc.
- **Styling**:
  - Background: `#3D1C35` (Maroon)
  - Text color: `#FFFFFF`
  - Font: `11px`, Semi-bold (600), Uppercase
  - Padding: `4px 8px`
  - Border radius: `4px`
  - Letter spacing: `0.5px`
  - Display: `inline-block`
  - Margin right: `8px`

#### Question Type Badge
- **Format**: "Single Choice", "Grid / Matrix", "Text Input", etc.
- **Styling**:
  - Background: `#F5F5F5` (Light gray)
  - Text color: `#666666`
  - Font: `11px`, Regular (400)
  - Padding: `4px 8px`
  - Border radius: `4px`
  - Display: `inline-block`
  - Margin right: `12px`

#### Question Text
- **Element**: Paragraph or heading
- **Styling**:
  - Font: `15px`, Regular (400)
  - Color: `#1A1A1A`
  - Line height: `1.6`
  - Margin top: `12px`
  - Margin bottom: `16px`

### 3.3 Question Options Area

#### Single Choice (Radio Buttons)
```
○ Option 1
○ Option 2
○ Option 3
...
```
- **Structure**: Vertical list of radio buttons
- **Spacing**: `8px` between options
- **Radio Button**: 
  - Size: `20px`
  - Border: `2px solid #BDBDBD`
  - Margin right: `12px`
  - Vertical align: `middle`
- **Label**:
  - Font: `14px`, Regular (400)
  - Color: `#1A1A1A`
  - Cursor: `pointer`
  - Padding: `8px 0`

#### Multiple Choice (Checkboxes)
```
☐ Option 1
☐ Option 2
☐ Option 3
...
```
- **Structure**: Vertical list of checkboxes
- **Styling**: Same as radio buttons but with square checkboxes

#### Grid/Matrix
```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│                 │ Column 1 │ Column 2 │ Column 3 │ Column 4 │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Row 1           │    ○     │    ○     │    ○     │    ○     │
│ Row 2           │    ○     │    ○     │    ○     │    ○     │
│ Row 3           │    ○     │    ○     │    ○     │    ○     │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

- **Structure**:
  - **Header Section**: 
    - "Column Attributes" label (optional)
    - Column headers in a row
  - **Scale Points Section**:
    - "Scale Points" label (optional)
    - Numbered list of scale descriptions
  - **Grid Table**:
    - Row headers (left column)
    - Radio buttons in cells

- **Styling**:
  - Table border: `1px solid #E0E0E0`
  - Header background: `#F5F5F5`
  - Header font: `13px`, Semi-bold (600), Center-aligned
  - Row font: `14px`, Regular (400)
  - Cell padding: `12px 8px`
  - Radio buttons: Centered in cells

- **Column Attributes Display**:
  - Show as horizontal list above grid
  - Font: `13px`, Semi-bold (600)
  - Spacing: `16px` between items
  - Example: "Innovative | Premium quality | Good value | Reliable | Trendy/Stylish | User-friendly"

- **Scale Points Display**:
  - Show as numbered list
  - Format: "[Number] [Description]"
  - Font: `14px`, Regular (400)
  - Example:
    ```
    1  Not at all associated
    2  Slightly associated
    3  Moderately associated
    4  Strongly associated
    5  Very strongly associated
    ```

#### Text Input
```
[                                                    ]
```
- **Element**: Text input or textarea
- **Styling**:
  - Border: `1px solid #BDBDBD`
  - Border radius: `6px`
  - Padding: `10px 12px`
  - Font: `14px`, Regular (400)
  - Width: `100%`
  - Min height: `44px` (single line) or `120px` (multi-line)
  - Focus: Border color `#3D1C35`, Outline `2px solid #3D1C35`

#### Dropdown
```
Select an option ▼
```
- **Element**: Select dropdown
- **Styling**:
  - Border: `1px solid #BDBDBD`
  - Border radius: `6px`
  - Padding: `10px 12px`
  - Font: `14px`, Regular (400)
  - Width: `100%` or specific width
  - Chevron icon: Right-aligned, `16px`, Color `#666666`

### 3.4 Metadata Row

Located below the question options, displays logic and configuration badges.

**Structure**:
```
[Default → SCR2] [IF response = [1, 6, 7] → TERM1] [Randomized (anchored: 6, 99)] [👁 Show Condition: BA3 != 99]
```

**Badge Types**:

1. **Default Badge** (Navigation)
   - Format: "Default → [TargetID]"
   - Background: `#3D1C35` (Maroon)
   - Text: `#FFFFFF`
   - Icon: Arrow (→)

2. **Conditional Logic Badge**
   - Format: "IF [condition] → [TargetID]"
   - Background: `#9C27B0` (Purple)
   - Text: `#FFFFFF`
   - Example: "IF response = [1, 6, 7] → TERM1"

3. **Randomization Badge**
   - Format: "Randomized (anchored: [numbers])" or "Randomized"
   - Background: `#3D1C35` (Maroon)
   - Text: `#FFFFFF`
   - Icon: Shuffle (🔀)

4. **Show Condition Badge**
   - Format: "Show Condition: [condition]"
   - Background: `#FFFFFF`
   - Border: `1px solid #FF9800`
   - Text: `#FF9800`
   - Icon: Eye (👁)

5. **Dynamic Options Badge**
   - Format: "Dynamic Options from: [SourceID]"
   - Background: `#00BCD4` (Cyan)
   - Text: `#FFFFFF`
   - Icon: Link (🔗)

**Styling**:
- Display: `inline-flex`
- Gap: `8px` between badges
- Margin top: `16px`
- Wrap: `wrap`

### 3.5 Notes Section

Optional section for additional information about the question.

**Structure**:
```
┌─────────────────────────────────────────────────┐
│ Notes:                                          │
│ • Validation: Required                          │
│ • Research Note: [Note text]                    │
│ • [Additional notes...]                         │
└─────────────────────────────────────────────────┘
```

**Styling**:
- Background: `#FFF9E6` (Very light yellow)
- Border left: `4px solid #FFC107` (Amber)
- Padding: `16px`
- Border radius: `4px`
- Margin top: `16px`
- Font: `13px`, Regular (400)
- Color: `#333333`
- Line height: `1.6`

**Label**:
- "Notes:" - Bold (700)

**List Items**:
- Bullet style: Standard disc
- Padding left: `20px`
- Margin bottom: `4px`

---

## 4. Special Question Types

### 4.1 Introduction/Welcome Screen
- **Type**: "Introduction Screen"
- **Structure**:
  - Question ID: "INTRO1", "INTRO2", etc.
  - Type badge: "Introduction Screen"
  - Welcome text (paragraph)
  - No options/input area
  - Metadata: Default navigation badge

**Example**:
```
[INTRO1] [Introduction Screen]

Thank you for participating in this research study about smartphones and mobile 
devices. Your opinions are valuable and will help us understand consumer preferences 
better. This survey will take approximately 12-15 minutes to complete. All responses 
are anonymous and confidential. Please answer honestly based on your personal 
opinions and experiences.

[Default → SCR1]
```

### 4.2 Screener Questions
- **Question ID Format**: "SCR1", "SCR2", etc.
- **Purpose**: Qualification questions
- **May include**: Termination logic, quota logic
- **Notes section**: Often includes validation and research notes

### 4.3 Termination/Thank You Screens
- **Type**: "Termination Screen" or "Thank You Screen"
- **Structure**: Similar to introduction screens
- **Content**: Thank you message or termination message
- **No navigation**: End of survey

---

## 5. Section Organization Rules

### 5.1 Section Naming Convention
- **Section 1**: "Introduction" - Welcome screens and consent
- **Section 2**: "Screener" - Qualification questions
- **Section 3+**: Descriptive names based on content (e.g., "Brand Perception", "Product Usage", "Demographics")

### 5.2 Section Grouping Logic
Group questions into sections based on:
1. **Purpose**: Introduction, Screener, Main Content, Demographics
2. **Topic**: Related questions together
3. **Flow**: Logical progression through survey
4. **Length**: Aim for 3-8 questions per section (flexible)

### 5.3 Question Numbering
- **Introduction**: INTRO1, INTRO2, etc.
- **Screener**: SCR1, SCR2, etc.
- **Main Questions**: Q1, Q2, Q3, etc. (or topic-specific like BA1, BA2 for Brand Awareness)
- **Termination**: TERM1, TERM2, etc.

---

## 6. Layout Specifications

### 6.1 Container Widths
- **Page Container**: Max width `800px`, centered
- **Section Container**: Full width of page container
- **Question Container**: Full width of section container
- **Matrix Tables**: May exceed container width, horizontal scroll if needed

### 6.2 Vertical Spacing
```
Page Title
  ↓ 32px
Objectives Section
  ↓ 24px
Audience Section
  ↓ 32px
Questionnaire Heading
  ↓ 16px
Section 1 Header
  ↓ 0px (connected)
Section 1 Content
  ↓ 16px
Section 2 Header
  ↓ 0px (connected)
Section 2 Content
  ↓ 16px
...
```

### 6.3 Question Spacing Within Section
```
Question 1 Container
  ↓ 20px
Question 2 Container
  ↓ 20px
Question 3 Container
  ↓ 20px
...
```

---

## 7. Responsive Behavior

### 7.1 Desktop (1024px+)
- Full layout as specified
- Matrix tables: Full width, horizontal layout

### 7.2 Tablet (768px - 1023px)
- Reduce container padding
- Matrix tables: May require horizontal scroll
- Maintain all structural elements

### 7.3 Mobile (<768px)
- Stack all elements vertically
- Matrix tables: 
  - Option 1: Horizontal scroll
  - Option 2: Convert to stacked cards (one row per card)
- Increase touch target sizes
- Collapse sections by default

---

## 8. Collapsible Sections

### 8.1 Default State
- **First section**: Expanded by default
- **Other sections**: Collapsed by default
- **User preference**: Remember expanded/collapsed state

### 8.2 Expand/Collapse Animation
- **Duration**: `300ms`
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- **Property**: `max-height` or `transform: scaleY()`
- **Chevron rotation**: `180deg`

### 8.3 Accessibility
- **ARIA attributes**: `aria-expanded`, `aria-controls`
- **Keyboard navigation**: Space/Enter to toggle
- **Focus management**: Maintain focus on header after toggle

---

## 9. Required Elements Checklist

Every generated survey MUST include:

- [ ] Page title (H1)
- [ ] Objectives section with bulleted list
- [ ] Audience section with sample size and quotas
- [ ] "Questionnaire" heading
- [ ] At least one section with header
- [ ] Section headers with question count and chevron
- [ ] Questions with ID badges and type badges
- [ ] Question text
- [ ] Appropriate input elements (radio, checkbox, matrix, etc.)
- [ ] Metadata badges where applicable (default, logic, randomization)
- [ ] Notes sections where applicable
- [ ] Consistent spacing throughout
- [ ] Consistent styling per theme specification

---

## 10. Implementation Notes

### 10.1 Parsing Questionnaires
When parsing uploaded questionnaires:
1. Identify survey metadata (title, objectives, audience)
2. Identify sections and group questions
3. Identify question types and options
4. Extract logic conditions and routing
5. Extract validation rules and notes
6. Map to this structure specification

### 10.2 Generating UI
When generating UI from questionnaire:
1. Apply this structure specification for layout
2. Apply `../shared/survey-ui-theme.md` for styling
3. Use `../shared/survey-components-spec.md` for component details
4. Ensure all required elements are present
5. Maintain consistency across all questions

### 10.3 Validation
Before presenting generated survey:
1. Verify all sections have headers
2. Verify all questions have ID and type badges
3. Verify spacing matches specification
4. Verify colors match theme specification
5. Verify all interactive elements are functional

---

## Related Documentation

- **Styling Details**: See `../shared/survey-ui-theme.md`
- **Component Specifications**: See `../shared/survey-components-spec.md`
- **Logic & Routing**: See `../shared/survey-logic-spec.md`
- **Question Types**: See `../shared/survey-question-types.md`

