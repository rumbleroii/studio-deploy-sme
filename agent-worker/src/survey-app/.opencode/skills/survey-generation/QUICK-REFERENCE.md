# Survey Generation - Quick Reference Card

One-page cheat sheet for generating consistent surveys.

---

## 🎯 Core Principle
**Every survey must look IDENTICAL. Use exact values. No variations.**

---

## 🚨 CRITICAL: Read ALL /skill Files Before You Code

**STOP! Before writing ANY code:**

1. ✅ Read **ALL** files in `.opencode/skills/` folder:
   - `survey-generation/` - All guides
   - `shared/` - ALL specs (text-input-validation-spec, question types, logic, matrix, other-options)
   - `survey-hosted/` - Runtime specs
   - **DO NOT skip any .md files**

2. ✅ Read implementation files:
   - `data/sample-survey.ts` - Correct schema format
   - `types/survey.ts` - TypeScript types (SOURCE OF TRUTH)
   - `components/QuestionRenderer.tsx` - What's implemented / Update as per requirement
   - `lib/zod-validator.ts` - Zod schema validation; UPDATE or use this for all schema and input validation
   -

3. ✅ Verify consistency:
   - Types match TypeScript schema (e.g., use `"numeric"` NOT `"numeric_input"`)
   - Metadata structure correct (e.g., `hasOtherOption` in metadata, NOT on option)
   - If docs contradict implementation, **follow implementation**

**Rushing to code = errors. Reading ALL files first = zero errors.**

---

## 📁 Files to Know

| File | Purpose | When to Use |
|------|---------|-------------|
| **SURVEY-SPECS-INDEX.md** | Master index | Start here |
| **survey-generation-guide.md** | Step-by-step process | Generating surveys |
| **VISUAL-REFERENCE.md** | Quick visual ref | Fast lookups |

---

## 🎨 Essential Values

### Colors (Exact Hex)
```
#3D1C35  Maroon (Question ID, Default Logic)
E0BFD8  Purple (Conditional Logic)
E0BFD8  Cyan (Dynamic Options)
#FF9800  Orange (Show Condition)
#1A1A1A  Black (Text Primary)
#666666  Gray (Text Secondary)
#E0E0E0  Light Gray (Borders)
#FFF9E6  Light Yellow (Notes BG)
#FFC107  Amber (Notes Border)
```

### Typography (Exact Sizes)
```
32px  Page Title (Bold 700)
16px  Section Title (Semi-bold 600)
15px  Question Text (Regular 400)
14px  Option Text (Regular 400)
11px  Badge Text (Semi-bold 600, UPPERCASE)
```

### Spacing (Exact Pixels)
```
40px  Page horizontal padding
24px  Section padding
20px  Question padding
8px   Between options
```

### Components (Exact Sizes)
```
20px  Radio button (circle)
20px  Checkbox (square, 3px radius)
8px   Card border radius
4px   Badge border radius
```

---

## 📋 Required Elements

Every survey MUST have:
- ✅ Page title (32px, bold)
- ✅ Objectives section (bulleted list)
- ✅ Audience section (sample size, quotas)
- ✅ Collapsible sections with question counts
- ✅ Question ID badge (pink, 11px, uppercase)
- ✅ Question type badge (gray, 11px)
- ✅ Metadata badges (logic, randomization, etc.)
- ✅ Notes sections (yellow bg, amber border)

---

## ⛔ NO Extra Questions

**CRITICAL RULE**: Only generate questions from the uploaded questionnaire.

- ❌ **NEVER add** questions not in the source document
- ❌ **NEVER add** intro/thank you screens unless in questionnaire
- ❌ **NEVER add** demographics, validation, or attention checks unless specified
- ✅ **ONLY generate** questions that exist in the uploaded file
- ✅ **Every question** must have a direct source in the document

**If unclear, ASK the user - don't invent.**

---

## ✅ Verify Question Types

**CRITICAL RULE**: Always use the correct question type.

**Common Error**: Rating questions generated as multiple choice ❌

### Quick Type Check:
- 🔢 **"Rate 1-5"** or **"How satisfied"** → `ratingScale` (NOT multipleChoice!)
- 📊 **"Rate 0-10"** or **"NPS"** → `slider` (NOT ratingScale!)
- ☑️ **"Select all that apply"** → `multipleChoice`
- ○ **"Choose one"** → `singleChoice`
- 📋 **Grid of items** → `matrix`

### Before Every Question:
1. Read question text carefully
2. Look for rating/scale keywords
3. Check if options are numbered (1-5)
4. Verify type matches format
5. Generate with correct type

---

## ⚠️ Text Input Validation (CRITICAL)

**⚠️ See `shared/text-input-validation-spec.md` for complete guide**

### Correct Structure:
```typescript
{
  type: "text",
  required: true,
  validation: [                    // ✅ Array of rules
    { type: "required" },
    { type: "pattern", value: "...", message: "..." }
  ],
  metadata: {                      // ✅ inputType in metadata
    inputType: "email",            // NOT in validation!
    placeholder: "...",
    maxLength: 100
  }
}
```

### Quick Validation Guide:
- 📧 **Email** → `metadata: { inputType: "email" }`
- 📞 **Phone** → `metadata: { inputType: "tel" }` + pattern validation
- 🔗 **URL** → `metadata: { inputType: "url" }`
- 🔢 **Number** → `metadata: { inputType: "number", min: X, max: Y }`
- 📝 **Alphabetic** → `validation: [{ type: "pattern", value: "^[a-zA-Z\\s]+$" }]`
- 💬 **Textarea** → `metadata: { inputType: "textarea", maxLength: 500 }`

### Before Every Text Input:
1. What type of data is expected?
2. Add appropriate `inputType`
3. Add validation pattern if needed
4. Add min/max or length constraints
5. Add meaningful error message

**Example:**
```typescript
// Age question
validation: {
  required: true,
  inputType: "number",
  min: 18,
  max: 120,
  errorMessage: "Please enter a valid age"
}
```

**See**: ../shared/survey-question-types.md for 10+ validation examples

### Text/Numeric Exclusive Checkbox

When questionnaire mentions "EXCLUSIVE" or "Don't know" or "Not aplicable" for text/numeric inputs:

```typescript
metadata: {
  exclusiveOption: "Prefer not to answer"  // Shows checkbox
}
```

**Behavior**: Checkbox lets user skip input but still pass validation.

---

## 🚨 ALL Questions Are Mandatory

**CRITICAL RULE**: Every question in the survey sequence MUST be answered.

```typescript
validation: {
  required: true  // MANDATORY for ALL questions
}
```

### What's Required:
✅ Single Choice - must select one
✅ Multiple Choice - must select ≥1 (minSelections)
✅ Text Input - must enter text (non-whitespace)
✅ Matrix - must answer ALL rows (requireAllRows: true)
✅ Number/Date/Dropdown - must provide value

### Exceptions ONLY:
❌ Introduction Screen
❌ Termination Screen
❌ Thank You Screen

### Why:
- Data quality & completeness
- Statistical validity
- Professional standard
- No partial responses

---

## ⚡ Exclusive Options (Multiple Choice)

Options that deselect all others when selected (e.g., "None of the above", "Not Applicable", "None", "Dont know").

```typescript
metadata: {
  exclusiveOptions: [99]  // Option ID (number), not value
}
```

**Common patterns**: "None of the above", "Prefer not to answer", "Not applicable"

**Working example**: See `data/sample-survey.ts` - Q4

---

## 🔀 Randomization & Anchoring

Randomize option order while keeping specific options at the bottom.

```typescript
metadata: {
  randomize: true,      // Randomize option order
  anchor: [99, 999]     // Option IDs to keep at end (array of numbers)
}
```

**Detection patterns**: "Randomize options", "Randomize order", "Show in random order", "Anchor: X, Y at bottom"

**Common anchored options**: "Other", "None of the above", "Prefer not to answer", "Don't know"

**Behavior**: Options randomized on load, anchored options stay at bottom, order consistent throughout survey

**Example combining features**:
```typescript
metadata: {
  randomize: true,
  anchor: [99],
  exclusiveOptions: [99]  // Option 99 is both anchored AND exclusive
}
```

**Working examples**: See `data/sample-survey.ts` - Q4 (complex), Q4a (standard)

---

## 🏷️ Badge Colors

| Badge Type | Background | Text | Border |
|------------|------------|------|--------|
| Question ID | #3D1C35 | White | None |
| Question Type | #F5F5F5 | #666666 | None |
| Default Logic | #3D1C35| White | None |
| Conditional Logic | #9C27B0 | White | None |
| Show Condition | White | #FF9800 | 1px #FF9800 |
| Randomization | #3D1C35 | White | None |
| Dynamic Options | #3D1C35 | White | None |

---

## 📐 Structure Template

```
[Project Name]                    32px Bold
  ↓ 32px
Objectives                        16px Semi-bold
• Item 1                          14px Gray
• Item 2
  ↓ 24px
Audience                          16px Semi-bold
Sample Size (N) = 500             14px Gray
Quotas: ...
  ↓ 32px
Questionnaire                     16px Semi-bold
  ↓ 16px
┌─────────────────────────────┐
│ Section 1: Name  N Qs    ▼ │  Collapsible header
└─────────────────────────────┘
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │
│ │ [ID] [Type]             │ │  Question badges
│ │                         │ │
│ │ Question text           │ │  15px
│ │   ↓ 16px                │ │
│ │ ○ Option 1              │ │  14px, 20px radio
│ │   ↓ 8px                 │ │
│ │ ○ Option 2              │ │
│ │   ↓ 16px                │ │
│ │ [Badge] [Badge]         │ │  Metadata
│ │   ↓ 16px (if notes)     │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ Notes:              │ │ │  Yellow bg
│ │ │ • Note 1            │ │ │
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
│   ↓ 20px                    │
│ [Next Question]             │
└─────────────────────────────┘
```

---

## ✅ Quick Checklist

Before presenting survey:
- [ ] Colors match spec (pink badges, gray text)
- [ ] Fonts match spec (32px title, 15px question, 11px badge)
- [ ] Spacing matches spec (40px page, 8px options)
- [ ] All badges present (ID, type, logic)
- [ ] Notes sections have yellow bg and amber border
- [ ] Radio buttons are 20px circles
- [ ] Checkboxes are 20px squares with 3px radius
- [ ] **ALL questions have `required: true`** (except INTRO, TERM, THANK)
- [ ] Matrix questions have `requireAllRows: true`
- [ ] Multiple choice have `minSelections: 1`
- [ ] Text inputs have whitespace validation
- [ ] **Zod schema validation passes**: `npx tsx test-validation.ts`

## 🚨 MANDATORY QA (DO NOT SKIP)

**After Zod validation passes, you MUST test a happy flow:**

- [ ] **Run Zod validation**: `npx tsx test-validation.ts` - FIX ALL ERRORS
- [ ] **Test hosted survey**: Complete at least 1 happy flow path in `/survey`
- [ ] **Verify dynamic piping**: Check any questions with `pipeOptionsFrom` or `pipeRowsFrom`
- [ ] **Verify logic/routing**: Skip logic, show/hide conditions work correctly
- [ ] **Reach completion**: Survey can be completed without runtime errors

**Why both are required:**
- Zod catches **schema structure errors** (type mismatches, missing fields)
- Happy flow testing catches **runtime errors** (piping not working, logic failures)
- **Example:** Q13 piping from Q11 passed Zod but failed at runtime because `filterByValue` wasn't implemented

**If happy flow fails:**
1. Diagnose the issue (browser console, component code)
2. Fix the schema OR the implementation (masking.ts, logic-evaluator.ts, etc.)
3. Re-run Zod validation
4. Re-test happy flow
5. Repeat until it works

---

## 🔍 VERIFY BEFORE USE (CRITICAL)

**Before using ANY metadata feature, verify it's implemented:**

1. **Check `lib/masking.ts`** for piping features (`pipeRowsFrom`, `pipeOptionsFrom`, `filterByValue`, `filterByQuestion`)
2. **Check `lib/logic-evaluator.ts`** for logic features (`show`, `skip`, `terminate`, operators)
3. **Check `types/survey.ts`** for supported type definitions

**Common trap:** Schema accepts a property but runtime doesn't use it.

| Feature | Verify In | What To Check |
|---------|-----------|---------------|
| `filterByValue` | `masking.ts` | Matrix source handling |
| `filterByQuestion` | `masking.ts` | Cross-question filter logic |
| `pipeRowsFrom` | `masking.ts` | `generateDynamicRows()` function |
| `pipeOptionsFrom` | `masking.ts` | `generateDynamicOptions()` function |
| Logic operators | `logic-evaluator.ts` | `evaluateExpression()` switch cases |

**Rule:** If you can't find the feature in the implementation, either:
1. Use an alternative that IS implemented, OR
2. Implement the feature first, then use it

**Production Mode Additional:**
- [ ] `MONGODB_URI` in `.env.local` (if `NEXT_PUBLIC_DEPLOYMENT=production`)
- [ ] MongoDB running and accessible
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database connection verified

---

## 🚫 Never Do

❌ Change colors from specification
❌ Change font sizes from specification
❌ Change spacing from specification
❌ Omit question ID or type badges
❌ Use different badge colors
❌ Skip metadata badges
❌ Forget notes sections
❌ Use inconsistent spacing
❌ Make questions optional (required: false)
❌ Skip validation rules
❌ **Forget database setup for production mode**

---

## ✅ Always Do

✅ Use exact hex colors
✅ Use exact pixel sizes
✅ Include all required badges
✅ Include notes sections
✅ Maintain consistent spacing
✅ Follow structure template
✅ Verify against checklist
✅ Set required: true for ALL questions
✅ Include validation for every question type
✅ **Check database setup if production mode (`MONGODB_URI` + MongoDB running)**

---

## 🔍 Common Question Types

| Type | Badge Text | Input |
|------|------------|-------|
| Introduction | Introduction Screen | None |
| Single Choice | Single Choice | Radio buttons (○) |
| Multiple Choice | Multiple Choice | Checkboxes (☐) |
| Grid/Matrix | Grid / Matrix | Table with radios |
| Text Input | Text Input | Text field |
| Text Area | Text Area | Textarea |
| Dropdown | Dropdown | Select (▼) |

## 🎯 "Other (Please Specify)" Pattern

**COMMON**: Appears in 50%+ of questionnaires!

### Detection:
- "Other (please specify)"
- "Other (specify)"
- "Other: ___________"
- "Something else (explain)"

### Schema:
```typescript
{
  id: "99",
  label: "Other (please specify)",
  hasOtherOption: true,          // Shows text input
  otherInputRequired: true,       // Text required when selected
  otherInputPlaceholder: "Please specify",
  otherInputMaxLength: 100
}
```

### Behavior:
- Text input **hidden** initially
- **Appears** when option selected
- **Required** when option selected
- **Clears** when option deselected

**See**: ../shared/other-option-spec.md for complete details

---

## ✍️ Text Input Validation

**MANDATORY**: All text inputs must prevent whitespace-only responses!

### Rules:
```typescript
{
  trimWhitespace: true,      // Trim on blur & submit
  rejectWhitespaceOnly: true // Reject "   " as invalid
}
```

### Behavior:
- **On blur**: Trim leading/trailing spaces automatically
- **On submit**: Trim all text inputs before validation
- **If empty after trim**: Show error "This field is required"
- **Length validation**: Calculate AFTER trimming

### Example:
| Input | After Trim | Valid? |
|-------|------------|--------|
| "Hello" | "Hello" | ✅ Yes |
| "  Hello  " | "Hello" | ✅ Yes (trimmed) |
| "     " | "" | ❌ No (whitespace-only) |

**Applies to**:
- Text Input (short text)
- Text Area (long text)
- "Other (specify)" inputs

---

## ⚠️ Selection Validation Timing

**Bug**: Option selected but shows "Please select an option" error!

**Cause**: Validation runs BEFORE state updates (race condition)

**Fix**:
```javascript
// ❌ WRONG
function handleNext() {
  if (!validate()) { showError(); }
}

// ✅ CORRECT
function handleNext() {
  requestAnimationFrame(() => {
    if (!validate()) { showError(); }
  });
}
```

**Rules**:
- NEVER validate immediately on click
- ALWAYS use `requestAnimationFrame()` or `setTimeout(fn, 0)`
- Clear errors when option selected
- Prevent double-click

**Applies to**: Radio, Checkbox, Matrix questions

---

## 🚫 NEVER Auto-Select Options

**CRITICAL**: No options auto-selected in ANY question!

### Initial States:
```javascript
Radio:    selectedOption = null
Checkbox: selectedOptions = []
Dropdown: selectedValue = null (show placeholder)
Matrix:   matrixResponses = {}
Rating:   rating = null
```

### Why:
- Creates response bias
- Skews data
- Unprofessional
- Invalidates results

### Exception: NONE

---

## 🏷️ Logic Badge Formats

```
[Default → SCR2]
[IF response = [1] → TERM1]
[IF response = [1, 6, 7] → TERM1]
[👁 Show Condition: BA3 != 99]
[🔀 Randomized (anchored: 6, 99)]
[🔗 Dynamic Options from: BA4]
```

---

## 🔄 Piping/Text Substitution

**Detect These Patterns:**
```
{{Q1}}, {Q1}, [Q1], <Q1>, $Q1$
INSERT Q1 RESPONSE
{{Q1 label}}, {Q1 option}
```

**Convert to Standard:**
```
[INSERT Q1]         → Raw value
[INSERT Q1 LABEL]   → Option label
[INSERT Q1.SUM]     → Custom calculation
```

**Examples:**
```
Questionnaire → Schema
──────────────────────────────────────────
"You said {{Q1}}"        → "You said [INSERT Q1]"
"You chose {Q3 option}"  → "You chose [INSERT Q3 LABEL]"
"Total: $sum of Q4$"     → "Total: $[INSERT Q4.SUM]"
```

**Works in:** Both authoring and respondent views automatically ✅

---

## 🔗 Dynamic Option Piping

**When to use:** Questions where options are generated from previous question responses.

**Detect these patterns:**
- "Show selected items from Q[X]"
- "Based on your answer to Q[X], which..."
- "Of the [items] you selected..."
- "Rank the options you chose in Q[X]"

**Schema structure:**
```typescript
{
  id: 'Q10',
  type: 'multiple_choice',
  options: [], // ⚠️ KEEP EMPTY - options generated at runtime
  metadata: {
    pipeOptionsFrom: {
      sourceQuestionId: 'Q9',            // Question to pull from
      generateFrom: 'selected_options',  // or 'all_options'
      excludeValues: ['none', 'other'],  // Filter out these
      includeOtherText: true             // Include typed "Other" text
    }
  }
}
```

**Key differences:**
- **Text piping** (`[INSERT Q1]`): Inserts values into question text
- **Dynamic option piping** (`pipeOptionsFrom`): Generates OPTIONS themselves

**Chained piping support:**
- Q9 → Q10 → Q11 chains work automatically
- Q11 points to Q10, system resolves Q10 → Q9 recursively
- No special configuration needed for chains

**Working examples:** `data/sample-survey.ts` - Q9, Q10, Q11

---

## 📊 Matrix Table Format

**⚠️ CRITICAL**: Matrix questions fail often! See ../shared/matrix-question-guide.md for detailed instructions.

### Two Types:
- **Single-Attribute** (90%): NO "Column Attributes" section → `type: "matrix"`
- **Multi-Attribute** (10%): HAS "Column Attributes" section → `type: "matrix-multi-attribute"`

### Standard Format:
```
Scale Points
1  Description 1
2  Description 2
3  Description 3

┌─────────┬─────┬─────┬─────┐
│         │  1  │  2  │  3  │  Header: #F5F5F5
├─────────┼─────┼─────┼─────┤
│ Row 1   │  ○  │  ○  │  ○  │  Data: #FFFFFF
│ Row 2   │  ○  │  ○  │  ○  │  Alt: #FAFAFA
└─────────┴─────┴─────┴─────┘
```

**Key**: Rows = Items being rated, Columns = Scale (1-5), Scale Points = Explanations

### Validation (CRITICAL):
```typescript
validation: {
  required: true,
  requireAllRows: true  // DEFAULT: All rows must be answered
}
```

**ALWAYS require all rows** unless questionnaire explicitly says "optional" or "if applicable"

---

## 🚨 Zero Omissions Rule

**CRITICAL**: ALL questions from questionnaire MUST be generated - NO EXCEPTIONS!

### Before Generation:
1. **Count total questions** in questionnaire
2. **Create master list** of all question IDs
3. **Note section breakdown** (e.g., Section 1: 5 questions, Section 2: 8 questions)

### During Generation:
- **Parse sequentially** - go through questionnaire in order
- **Check off each question** as you add it to schema
- **Never skip** - if unclear, generate as text question with review note

### After Generation:
- **Count schema questions** and verify matches questionnaire total
- **Output verification report**: "Generated 25/25 questions ✅"

**See**: complete-generation-checklist.md for comprehensive instructions

---

## 💡 Quick Tips

1. **Start with** `complete-generation-checklist.md` - Ensures zero omissions
2. **For matrix questions** - Use `../shared/matrix-question-guide.md`
3. **Reference** `VISUAL-REFERENCE.md` for quick lookups
4. **Verify** against checklist before presenting
5. **Use exact values** - no approximations
6. **Maintain consistency** - every survey identical

---

## 🎯 Success = Consistency

Every survey from any questionnaire should:
- Look the same ✅
- Use same colors ✅
- Use same fonts ✅
- Use same spacing ✅
- Have same structure ✅
- Include same elements ✅

---

## 📞 Need More Detail?

| Topic | See Document |
|-------|--------------|
| **Zero omissions** | complete-generation-checklist.md |
| **Matrix questions** | ../shared/matrix-question-guide.md |
| **"Other" options** | ../shared/other-option-spec.md |
| Full process | survey-generation-guide.md |
| All colors/fonts | ../shared/survey-ui-theme.md |
| Layout structure | survey-structure-spec.md |
| Components | ../shared/survey-components-spec.md |
| Question types | ../shared/survey-question-types.md |
| Logic/routing | ../shared/survey-logic-spec.md |
| Visual examples | VISUAL-REFERENCE.md |

---

**Print this page and keep it handy for quick reference!**

