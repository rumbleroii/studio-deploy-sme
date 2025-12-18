# Survey Generation Guide for Claude

This is the master guide for generating surveys from uploaded questionnaires using the existing Next.js application at `../src/survey-app` as boilerplate. Follow this guide EXACTLY every time a user uploads a questionnaire and asks you to create a survey.

---

## Overview

When a user uploads a questionnaire document and asks you to create a survey, you MUST:

1. Work within the existing `../src/survey-app` application (never create from scratch)
2. Parse the questionnaire content
3. Extract all survey elements
4. Create a survey schema file in `../src/survey-app/data/`
5. Update the application to use the new schema
6. Ensure all styling remains consistent with the preserved theme

---

## Required Specification Documents

You MUST reference these documents for EVERY survey generation:

1. **`../shared/survey-ui-theme.md`** - All colors, fonts, spacing, borders, shadows
2. **`survey-structure-spec.md`** - Document hierarchy, layout, sections
3. **`../shared/survey-components-spec.md`** - Component specifications and styling
4. **`../shared/survey-question-types.md`** - Question type definitions and formats
5. **`../shared/survey-logic-spec.md`** - Logic, routing, and conditional display

---

## Step-by-Step Generation Process

### Step 0: Understand the Boilerplate Application

**Before starting, familiarize yourself with `../src/survey-app`:**

1. **Read existing schema files:**
   - `../src/survey-app/data/sampleSurveyWithLogic.ts`
   - `../src/survey-app/data/sample-survey.ts`
   - Understand the TypeScript interface and structure

2. **Review existing components:**
   - `../src/survey-app/components/` - All reusable UI components
   - These handle badges, questions, sections automatically

3. **Check the theme:**
   - `../src/survey-app/app/globals.css` - Theme already implemented
   - DO NOT modify this file

4. **Review the authoring view:**
   - `../src/survey-app/app/page.tsx` - Main survey display page
   - See how it imports and uses survey schemas

### Step 1: Parse Questionnaire

**IMPORTANT - Questionnaire Location:**
- User-uploaded questionnaires are stored in the `user_files` directory
- Always look for questionnaire files in `user_files/` when the user mentions they uploaded a document
- Common file types: `.doc`, `.docx`, `.pdf`, `.txt`
- If the user says "I uploaded a questionnaire", check `user_files/` for the most recent file

Extract the following from the uploaded questionnaire:

#### A. Survey Metadata
- [ ] Survey/Project title
- [ ] Survey objectives (list)
- [ ] Target audience information
- [ ] Sample size
- [ ] Quota information

#### A1. Survey Settings (REQUIRED DEFAULTS)
**ALWAYS include these default settings unless user explicitly requests otherwise:**
```typescript
settings: {
  allowBack: true,
  showProgress: true,
  autoSave: true,
  timeLimit: 600,        // 10 minutes in seconds (DEFAULT)
  showTimer: false       // Don't show timer to respondent by default
}
```

**CRITICAL NOTES:**
- Always set `timeLimit: 600` (10 minutes) by default
- Only remove or change timeLimit if user explicitly asks
- Set `showTimer: false` by default (timer runs but isn't displayed)
- If user wants NO time limit, set `timeLimit: 0` or omit it entirely

#### B. Sections
- [ ] Identify all sections
- [ ] Section names and descriptions
- [ ] Group questions into sections

#### C. Questions
For each question, extract:
- [ ] Question ID
- [ ] Question type
- [ ] Question text
- [ ] Answer options (if applicable)
- [ ] Logic/routing rules
- [ ] Validation rules
- [ ] Notes/comments

#### D. Logic & Routing
- [ ] Default navigation
- [ ] Conditional navigation
- [ ] Show/hide conditions
- [ ] Randomization rules
- [ ] Dynamic options
- [ ] Piping/text substitution

---

### Step 2: Reference Theme Specifications (Do Not Recreate)

The theme is already implemented in `../src/survey-app/app/globals.css`. Reference specs for understanding only:

#### Page Header
```
[Project Name]                          ← 32px, Bold (700), #1A1A1A
                                        ← 32px margin bottom

Objectives                              ← 16px, Semi-bold (600)
• Objective 1                           ← 14px, Regular (400), #666666
• Objective 2
• Objective 3
                                        ← 24px margin bottom

Audience                                ← 16px, Semi-bold (600)
Sample Size (N) = 500                   ← 14px, Regular (400), #666666
Quotas:
  • Quota 1 Split
  • Quota 2 Split
                                        ← 32px margin bottom

Questionnaire                           ← 16px, Semi-bold (600)
                                        ← 16px margin bottom
```

#### Section Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Section 1: Introduction              1 Question          ▼ │ ← Section Header
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Question content here]                                    │ ← Section Content
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                        ← 16px margin bottom
```

#### Question Structure
```
┌─────────────────────────────────────────────────────────────┐
│ [INTRO1] [Introduction Screen]      ← Badges               │
│                                                             │
│ Question text goes here...           ← 15px, Regular (400) │
│                                                             │
│ [Options/Input area]                                        │
│                                                             │
│ [Default → SCR1]                     ← Metadata badges     │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Notes:                             ← Notes section   │   │
│ │ • Note 1                                             │   │
│ └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### Step 3: Apply Theme Specification

Follow `../shared/survey-ui-theme.md` exactly:

#### Colors
- Background: `#FFFFFF`
- Text Primary: `#1A1A1A`
- Text Secondary: `#666666`
- Accent Maroon: `#3D1C35` (all primary badges)
- Accent Light Maroon: `#E0BFD8` (show condition, notes background)
- Border: `#E0E0E0`

#### Typography
- Page Title: `32px`, Bold (700)
- Section Title: `16px`, Semi-bold (600)
- Question Text: `15px`, Regular (400)
- Option Text: `14px`, Regular (400)
- Badge Text: `11px`, Semi-bold (600), Uppercase

#### Spacing
- Page padding: `40px` horizontal, `32px` vertical
- Section padding: `24px`
- Question padding: `20px`
- Between sections: `24px`
- Between questions: `20px`
- Between options: `8px`

#### Borders & Radius
- Border: `1px solid #E0E0E0`
- Border radius: `8px` (cards), `4px` (badges)
- Radio buttons: `20px` diameter, `50%` radius
- Checkboxes: `20px` square, `3px` radius

---

### Step 4: Apply Component Specifications

Follow `../shared/survey-components-spec.md` exactly:

#### Question ID Badge
```css
Background: #3D1C35
Color: #FFFFFF
Font: 11px, Semi-bold (600), Uppercase
Padding: 4px 8px
Border radius: 4px
Letter spacing: 0.5px
```

#### Question Type Badge
```css
Background: #F5F5F5
Color: #666666
Font: 11px, Regular (400)
Padding: 4px 8px
Border radius: 4px
```

#### Radio Button
```css
Size: 20px diameter
Border: 2px solid #BDBDBD
Border radius: 50%
Selected: Black fill (#1A1A1A) with white center dot (8px)
```

#### Checkbox
```css
Size: 20px square
Border: 2px solid #BDBDBD
Border radius: 3px
Selected: Black fill (#1A1A1A) with white checkmark
```

#### Logic Badges
- Default: `#3D1C35` background, white text
- Conditional: `#3D1C35` background, white text
- Show Condition: Transparent background, `#E0BFD8` border and text
- Randomization: `#3D1C35` background, white text
- Dynamic Options: `#3D1C35` background, white text

---

### Step 5: Apply Question Type Specifications

Follow `../shared/survey-question-types.md` exactly:

#### Introduction Screen
- Type badge: "Introduction Screen"
- Question ID: INTRO1, INTRO2, etc.
- No options/input area
- Metadata: Default navigation only

#### Single Choice
- Type badge: "Single Choice"
- Vertical list of radio buttons
- 8px spacing between options
- Metadata: Navigation, logic, randomization

#### Multiple Choice
- Type badge: "Multiple Choice"
- Vertical list of checkboxes
- 8px spacing between options
- May include exclusive options

#### Grid/Matrix
- Type badge: "Grid / Matrix"
- Display column attributes above grid
- Display scale points as numbered list
- Table with header row and data rows
- Radio buttons centered in cells

#### Text Input
- Type badge: "Text Input" or "Text Area"
- Single line: min-height 44px
- Multi-line: min-height 120px
- Border: 1px solid #BDBDBD
- Border radius: 6px

---

### Step 6: Apply Logic Specifications

Follow `../shared/survey-logic-spec.md` exactly:

#### Default Navigation
```
[Default → SCR2]
Background: #3D1C35, Text: #FFFFFF
```

#### Conditional Logic
```
[IF response = [1, 6, 7] → TERM1]
Background: #3D1C35, Text: #FFFFFF
```

#### Show Condition
```
[👁 Show Condition: BA3 != 99]
Background: Transparent, Border: 1px solid #E0BFD8, Text: #E0BFD8
```

#### Randomization
```
[🔀 Randomized (anchored: 6, 99)]
Background: #3D1C35, Text: #FFFFFF
```

#### Dynamic Options
```
[🔗 Dynamic Options from: BA4]
Background: E0BFD8, Text: #FFFFFF
```

---

### Step 3: Update or Create Survey Schema

**Choose the appropriate action:**

#### Option A: Update Existing Survey
**When user asks to modify/update questions, logic, or content:**

1. **Locate the existing survey file:**
   - Check `../src/survey-app/data/sample-survey.ts` or other existing surveys
   - Read the current schema

2. **Make the requested changes:**
   - Update questions, options, logic as requested
   - Maintain the exact TypeScript structure
   - Keep all theme-related data intact

3. **Verify consistency:**
   - Ensure all required fields remain present
   - Check that question IDs are unique
   - Validate logic references

#### Option B: Create New Survey (Rare)
**Only when user explicitly uploads a completely NEW questionnaire for a different project:**

1. **Create new file:** `../src/survey-app/data/[survey-name]-survey.ts`
2. **Follow structure** from existing schemas
3. **Update `../src/survey-app/app/page.tsx`** to import new survey if needed

**Default behavior:** Always update existing surveys unless explicitly told otherwise.

---

### Step 4: Verify Component Compatibility

1. **Check existing components:**
   - Components in `../src/survey-app/components/` should handle the schema
   - Badge.tsx, QuestionCard.tsx, QuestionRenderer.tsx, SurveySection.tsx

2. **Only modify components if:**
   - New question type not supported
   - New functionality explicitly requested
   - Otherwise, reuse existing components

3. **Maintain theme:**
   - Never modify `../src/survey-app/app/globals.css`
   - All UI elements use existing theme classes

---

## Quality Checklist

Before presenting the generated survey, verify:

### Structure
- [ ] Page title is present and styled correctly
- [ ] Objectives section is present with bulleted list
- [ ] Audience section is present with sample size and quotas
- [ ] "Questionnaire" heading is present
- [ ] All sections have headers with question counts
- [ ] Section headers have chevron icons
- [ ] Sections are collapsible
- [ ] Questions are properly grouped into sections

### Questions
- [ ] Every question has a question ID badge
- [ ] Every question has a question type badge
- [ ] Question text is properly formatted
- [ ] Options are displayed correctly for question type
- [ ] Spacing between options is consistent (8px)
- [ ] Matrix questions show column attributes and scale points
- [ ] Matrix tables are properly formatted

### Styling
- [ ] All colors match theme specification
- [ ] All font sizes match theme specification
- [ ] All spacing matches theme specification
- [ ] All borders and border radius match specification
- [ ] Radio buttons are 20px diameter circles
- [ ] Checkboxes are 20px squares with 3px radius
- [ ] Badges have correct colors and styling

### Logic & Metadata
- [ ] Default navigation badges are present
- [ ] Conditional logic badges are present where applicable
- [ ] Show condition badges are present where applicable
- [ ] Randomization badges are present where applicable
- [ ] Dynamic option badges are present where applicable
- [ ] All badges are in the metadata row below options
- [ ] Badge colors are correct

### Notes
- [ ] Notes sections are present where applicable
- [ ] Notes have light maroon background (#E0BFD8)
- [ ] Notes have maroon left border (4px solid #3D1C35)
- [ ] Notes content is properly formatted

### Accessibility
- [ ] All interactive elements have proper labels
- [ ] Touch targets are minimum 44x44px
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus states are defined

---

## Common Mistakes to Avoid

### ❌ DON'T:
1. Create a new Next.js app from scratch
2. Modify `../src/survey-app/app/globals.css` theme file
3. Change colors, fonts, or spacing from specifications
4. Recreate existing components unnecessarily
5. Omit question ID or type badges in schema
6. Create new survey files when updating existing surveys
7. Forget to include metadata badges in schema
8. Forget to include notes sections in schema
9. Change the schema structure format
10. Deviate from existing TypeScript interfaces

### ✅ DO:
1. Always work within `../src/survey-app` directory
2. Update existing survey files (like sample-survey.ts) by default
3. Reuse existing components from `../src/survey-app/components/`
4. Preserve the theme in `../src/survey-app/app/globals.css`
5. Follow exact schema structure from existing surveys
6. Include all required fields in survey schema
7. Maintain TypeScript type consistency
8. Verify component compatibility after changes
9. Keep all badge, logic, and note data in schema
10. Follow existing patterns and conventions

---

## Example Generation Flow

### Example 1: Update Existing Survey
```
User: "Update Q5 in the survey to be a matrix question and add 2 new questions."
```

### Process:
1. **Read existing**: Open `../src/survey-app/data/sample-survey.ts`
2. **Parse request**: Change Q5 type, add 2 new questions
3. **Reference specs**: Check matrix format from `../shared/survey-question-types.md`
4. **Update schema**: Modify Q5, add new questions
5. **Verify**: Ensure schema validity, theme data intact
6. **Output**: Updated survey in existing boilerplate app

### Example 2: Completely New Survey
```
User: "Here's a customer satisfaction questionnaire. Create the survey."
[Uploads customer-sat.docx]
```

### Process:
1. **Locate**: Check `user_files/` directory for `customer-sat.docx`
2. **Parse**: Extract all content from uploaded questionnaire in `user_files/`
3. **Read boilerplate**: Study `../src/survey-app/data/sampleSurveyWithLogic.ts` structure
4. **Update existing file**: Replace content in `../src/survey-app/data/sample-survey.ts` OR create new file `customer-satisfaction-survey.ts`
5. **Update page.tsx**: If new file created, import it in `../src/survey-app/app/page.tsx`
6. **Verify**: Confirm existing components render the new schema
7. **Output**: New survey integrated into existing boilerplate app

**KEY POINT**: Whether updating or replacing, ALWAYS work within `../src/survey-app`. Never create a new Next.js app from scratch.

---

## Consistency Rules

### ALWAYS:
1. Work within `../src/survey-app` directory (never create new apps)
2. Update existing survey schemas (default behavior)
3. Preserve theme in `../src/survey-app/app/globals.css` exactly
4. Reuse existing components from `../src/survey-app/components/`
5. Follow exact schema structure from existing surveys
6. Use the same colors for the same elements (per specifications)
7. Use the same fonts and sizes (per specifications)
8. Include all required fields in schema (metadata, sections, questions, logic, notes)
9. Maintain TypeScript type consistency
10. Follow existing patterns and conventions

### NEVER:
1. Create a new Next.js application from scratch
2. Modify `../src/survey-app/app/globals.css` theme
3. Deviate from color, font, or spacing specifications
4. Recreate existing components unnecessarily
5. Change the schema structure format
6. Omit required fields from survey schema
7. Change badge colors from specifications
8. Use inconsistent spacing
9. Skip required sections or metadata
10. Ignore existing TypeScript interfaces

---

## Responsive Considerations

### Desktop (1024px+)
- Full layout as specified
- All spacing as specified

### Tablet (768px - 1023px)
- Reduce horizontal padding to 24px
- Maintain all other spacing

### Mobile (<768px)
- Reduce horizontal padding to 16px
- Stack matrix columns vertically or use horizontal scroll
- Increase touch targets to 44x44px minimum
- Maintain color and font specifications

---

## Final Notes

1. **Use the boilerplate** - ALWAYS work within `../src/survey-app`, never create from scratch
2. **Update by default** - Modify existing survey files unless explicitly creating new project
3. **Preserve theme** - Never modify `../src/survey-app/app/globals.css`
4. **Reuse components** - Use existing components from `../src/survey-app/components/`
5. **Consistency is paramount** - Every survey must look identical (same theme, spacing, formatting)
6. **Reference all specs** - Always check specification documents for colors, fonts, spacing
7. **No variations** - Do not make creative changes or improvements to theme
8. **Quality check** - Always verify against the checklist before presenting

---

## When User Uploads a Questionnaire

### Your Response Should:

1. Acknowledge receipt of questionnaire
2. Check `user_files/` directory for the uploaded file
3. Parse the questionnaire content from `user_files/`
4. Update the survey schema in `../src/survey-app/data/`
5. Verify compatibility with existing components
6. Confirm theme consistency maintained

### Example Response:

```
I've received your questionnaire. I'll update the survey in the existing Next.js boilerplate
at ../src/survey-app following all theme specifications.

[Checking user_files/ directory for uploaded questionnaire...]
[Reading existing schema structure...]
[Parsing questionnaire content from user_files/...]
[Updating ../src/survey-app/data/sample-survey.ts with new content...]

The survey has been updated with:
✓ All questions and logic from your questionnaire
✓ Consistent theme preserved (colors, fonts, spacing)
✓ Proper schema structure maintained
✓ Existing components reused
✓ All badges, metadata, and notes included

The updated survey is ready in the existing ../src/survey-app boilerplate.
```

---

## Related Documentation

- **Theme**: `../shared/survey-ui-theme.md` - Colors, fonts, spacing, borders
- **Structure**: `survey-structure-spec.md` - Layout, hierarchy, sections
- **Components**: `../shared/survey-components-spec.md` - Component specifications
- **Question Types**: `../shared/survey-question-types.md` - Question formats
- **Logic**: `../shared/survey-logic-spec.md` - Logic, routing, conditions

---

## Version Control

When specifications are updated:
1. Update the relevant specification file
2. Update this guide if needed
3. Ensure all generated surveys use the latest specifications
4. Maintain consistency across all surveys

---

**Remember: The goal is 100% consistency. Every survey generated from any questionnaire should have the exact same look, feel, theme, spacing, colors, and formatting.**

