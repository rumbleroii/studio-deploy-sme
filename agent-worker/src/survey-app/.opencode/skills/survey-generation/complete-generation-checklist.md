# Complete Survey Generation Checklist

**Purpose**: Ensure ALL questions from the questionnaire are parsed and generated correctly with ZERO omissions.

---

## Critical Rule: Parse EVERYTHING

**NEVER skip a question, even if:**
- It's complex or unclear
- You're unsure of the question type
- The format is ambiguous
- There are parsing errors

**When uncertain, generate the question in a simple format and add a note for manual review.**

## Critical Rule: NO Extra Questions

**NEVER add questions that are not in the uploaded questionnaire:**

- ❌ **NEVER add** questions not in the source document
- ❌ **NEVER add** introductions, thank you screens, or demographic questions unless they exist in the questionnaire
- ❌ **NEVER add** validation questions, attention checks, or test questions unless specified
- ❌ **NEVER "improve" or "enhance"** the survey by adding your own questions
- ✅ **ONLY generate** questions that have a direct source in the uploaded file
- ✅ **Every question** must correspond to content from the document

**If you think a question is missing, ASK the user - don't invent it yourself.**

## 🚨 Critical Rule: NO Extra OPTIONS (HIGHEST PRIORITY)

**This is the MOST COMMON error. NEVER add options that are not explicitly listed in the questionnaire.**

## Step 0: Read ALL Specification Files (MANDATORY)
Before generating ANY schema, read these files in full:
- [ ] other-option-spec.md
- [ ] matrix-question-guide.md
- [ ] survey-question-types.md
- [ ] survey-logic-spec.md

### What NOT to Add

#### 1. Introduction Screens
❌ DO NOT add unless in questionnaire:
- Welcome messages
- Consent forms
- Survey instructions
- Time estimates
- Privacy notices

#### 2. Demographic Questions
❌ DO NOT add unless in questionnaire:
- Age, Gender, Location
- Income, Education
- Employment status
- Household information

#### 3. Quality Control
❌ DO NOT add unless specified:
- Attention checks ("Select option 3")
- Consistency checks
- Speed traps
- Bot detection questions

#### 4. Closing Screens
❌ DO NOT add unless in questionnaire:
- "Thank you for participating"
- "Survey complete" messages
- Completion confirmations
- Redirect instructions

#### 5. Transitional Content
❌ DO NOT add:
- Section introductions not in questionnaire
- Explanatory screens between sections
- Additional instructions

#### 6. "Best Practice" Additions
❌ DO NOT add because they're "standard":
- NPS questions
- Open-ended feedback questions
- "Any other comments?" questions

### When Content is Ambiguous

#### Scenario 1: Unclear if Something is a Question
**Example**: "Please describe your experience"

**Action**:
- Generate it as a Text Area question
- Add note: "Generated based on prompt in questionnaire"

#### Scenario 2: Missing Question Details
**Example**: Question listed but no options provided

**Action**:
1. ASK the user for clarification
2. If urgent, generate as Text Input with note
3. DO NOT invent options

#### Scenario 3: Incomplete Sections
**Example**: Section heading exists but no questions listed

**Action**:
1. **ASK** the user: "I see Section 3: Product Feedback, but no questions under it. Should I skip this section?"
2. DO NOT fill in questions yourself

#### Scenario 4: Logical Gaps
**Example**: Q1 exists, Q3 exists, Q2 seems missing

**Action**:
1. **ASK** the user: "The questionnaire goes from Q1 to Q3. Is Q2 intentionally omitted?"
2. DO NOT create Q2 yourself

### Question Count Validation

**Before Generation:**
1. Count all questions in source document
2. List them with IDs
3. Note the total count

**After Generation:**
1. Count questions in generated schema
2. Verify count matches source exactly
3. Check every question ID maps to source

**If Counts Don't Match:**
- Find the discrepancy
- Identify added/missed questions
- Correct immediately
- Never justify adding questions

### Common Mistakes

#### ❌ Mistake 1: "Improving" the Survey
**Wrong**: "I added an intro screen and thank you screen for better UX"
**Right**: "The questionnaire contains X questions. No intro/thank you screens specified."

#### ❌ Mistake 2: Filling Gaps
**Wrong**: "The questionnaire was missing demographics, so I added age, gender, location"
**Right**: "The questionnaire does not include demographic questions. Should I proceed without them?"

#### ❌ Mistake 3: Adding Best Practices
**Wrong**: "I added an NPS question at the end since it's standard practice"
**Right**: "The questionnaire does not include an NPS question."

#### ❌ Mistake 4: Creating Transitions
**Wrong**: "I added transition screens between sections to improve flow"
**Right**: "Sections presented as specified, without additional transitions."

### Verification Before Completion

- [ ] Every question in schema exists in source document
- [ ] Question count matches source exactly
- [ ] No intro screens added unless in source
- [ ] No thank you screens added unless in source
- [ ] No demographics added unless in source
- [ ] No validation questions added unless in source
- [ ] No "improvements" or "enhancements" made
- [ ] Every addition can be traced to source content

## Critical Rule: Verify Question Types

**ALWAYS check the question type before generating:**

Common critical error: **Generating rating questions as multiple choice**

### Before Every Question:
1. ✅ Read the question text completely
2. ✅ Look for keywords: "rate", "how satisfied", "how likely", "scale"
3. ✅ Check if options are numbered (1, 2, 3, 4, 5)
4. ✅ Identify if it's a rating scale, multiple choice, or single choice
5. ✅ Generate with the CORRECT type

### Type Decision Rules:
- **"Rate 1-5"** or **"How satisfied"** → `ratingScale` (NOT multipleChoice!)
- **"Rate 0-10"** or **"NPS"** → `slider` (NOT ratingScale!)
- **"Select all that apply"** → `multipleChoice`
- **"Choose one"** → `singleChoice`
- **Grid with multiple items** → `matrix`

## Critical Rule: Add Validation Based on Expected Answer

**ALWAYS add appropriate validation based on what type of answer is expected.**

### Validation Decision Process

For EVERY text input question:
1. ✅ Identify expected data type (number, email, text, phone, etc.)
2. ✅ Add appropriate `inputType`
3. ✅ Add validation pattern if needed
4. ✅ Add min/max or length constraints
5. ✅ Add meaningful error message

### Common Validations

**Numeric Questions** (age, quantity, year):
```typescript
validation: {
  required: true,
  inputType: "number",
  min: 18,
  max: 120,
  errorMessage: "Please enter a valid age"
}
```

**Email Questions**:
```typescript
validation: {
  required: true,
  inputType: "email",
  pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  errorMessage: "Please enter a valid email address"
}
```

**Phone Questions**:
```typescript
validation: {
  required: true,
  inputType: "tel",
  pattern: "^[0-9]{10}$",
  minLength: 10,
  maxLength: 15,
  errorMessage: "Please enter a valid phone number"
}
```

**Free Text Questions**:
```typescript
validation: {
  required: true,
  minLength: 10,
  maxLength: 500,
  rejectWhitespaceOnly: true,
  errorMessage: "Please provide at least 10 characters"
}
```

### Validation Checklist

Before generating each text/textArea question:
- [ ] Identified what type of data is expected
- [ ] Added appropriate `inputType` (number, email, tel, url)
- [ ] Added `pattern` for format validation
- [ ] Added `min`/`max` for numeric ranges
- [ ] Added `minLength`/`maxLength` for text length
- [ ] Added meaningful `errorMessage`
- [ ] Added `rejectWhitespaceOnly: true` for text inputs

**See**: `../shared/survey-question-types.md` for 10+ detailed validation examples with code.

---

## Pre-Generation Phase

### Step 1: Complete Questionnaire Review

Before starting generation, perform a complete scan:

- [ ] **Count total questions** in the uploaded questionnaire
- [ ] **Number each question** you identify (Q1, Q2, Q3... or use existing IDs)
- [ ] **Create a master list** of all question IDs
- [ ] **Note any sections** and their question counts
- [ ] **Log the total** (e.g., "Found 25 questions across 4 sections")

**Example Master List:**
```
Questionnaire: Customer Satisfaction Survey
Total Questions: 25

Section 1: Demographics (5 questions)
- INTRO1: Introduction Screen
- SCR1: Age (Single Choice)
- SCR2: Gender (Single Choice)
- SCR3: Location (Dropdown)
- SCR4: Income Range (Single Choice)

Section 2: Product Usage (8 questions)
- Q1: Product ownership (Single Choice)
- Q2: Purchase date (Date Picker)
- Q3: Frequency of use (Single Choice)
- Q4: Favorite features (Multiple Choice)
- Q5: Rating overall satisfaction (Rating Scale)
- Q6: Likelihood to recommend (Slider - NPS)
- Q7: Describe experience (Text Area)
- Q8: Improvement suggestions (Text Area)

Section 3: Brand Perceptions (10 questions)
- BA1: Brand familiarity (Multiple Choice)
- BA2: Brand usage (Multiple Choice)
- BA3: Primary brand (Single Choice)
- BA4: Brand awareness (Matrix - single attribute)
- BA5: Brand attributes (Matrix - multi-attribute)
- BA6: Brand preferences (Ranking)
- BA7: Reason for preference (Text Area)
- BA8: Brand switching (Single Choice)
- BA9: Brand loyalty (Likert Scale)
- BA10: Future purchase intent (Rating Scale)

Section 4: Closing (2 questions)
- Q20: Additional comments (Text Area)
- THANK1: Thank you screen
```

### Step 2: Identify Question Type for Each

For every question, explicitly determine its type:

| Question | Type Badge | Input Method | Notes |
|----------|-----------|--------------|-------|
| INTRO1 | Introduction Screen | None | Welcome message |
| SCR1 | Single Choice | Radio buttons | 7 age ranges |
| BA4 | Grid / Matrix | Radio grid | Single attribute |
| BA5 | Grid / Matrix | Radio grid | Multi-attribute! |
| Q7 | Text Area | Textarea | Min 50 chars |

**Use the Question Type Detection Guide below for accuracy.**

---

## Question Type Detection Guide

### Detection by Keywords/Patterns

| If Questionnaire Says... | Likely Type | Verify By |
|--------------------------|-------------|-----------|
| "Select one" / "Choose one" | Single Choice | One answer only |
| "Select all that apply" | Multiple Choice | Multiple answers OK |
| "Rate each..." + table format | Matrix | Rows and columns present |
| "Rank the following in order" | Ranking | Ordered list |
| "On a scale of 1-10" | Rating Scale or Slider | Numeric scale |
| "Strongly disagree to strongly agree" | Likert Scale | Agreement scale |
| "Please explain" / "In your own words" | Text Area | Long response |
| "Enter your name/email/phone" | Text Input | Short response |
| "Select from dropdown" / long list (>10 items) | Dropdown | Many options |
| "Select a date" | Date Picker | Date format |
| "How many..." | Numeric Input | Number only |
| "Welcome to the survey" | Introduction Screen | No input |
| "Thank you for completing" | Thank You Screen | No input |
| "Unfortunately..." | Termination Screen | End survey |

### Detection by Structure

#### Matrix Question Indicators:
- **Has table structure** with rows and columns
- **Multiple items** being rated on the same scale
- **"Scale Points" section** present
- **"Column Attributes" section** (optional - multi-attribute if present)
- Keywords: "Rate each", "For each", "Indicate for all"

#### Ranking Question Indicators:
- **Explicit ordering** required (1st, 2nd, 3rd...)
- Keywords: "Rank", "Order", "Prioritize", "Arrange"
- Numeric ranks assigned to items

#### Multi-Choice vs Single-Choice:
- **Multiple Choice**: "all that apply", "multiple", "any that", checkboxes mentioned
- **Single Choice**: "one only", "select one", radio buttons mentioned, mutually exclusive

---

## Generation Phase

### Step 1: Parse Questions Sequentially

Go through the questionnaire **in order**, one question at a time:

```
For each question in questionnaire:
  1. Extract question ID (or assign one)
  2. Determine question type (use detection guide)
  3. Extract question text
  4. Extract options/choices (if applicable)
  5. Extract validation rules
  6. Extract logic/routing
  7. Extract notes/comments
  8. Add to schema
  9. ✅ Check off master list
```

### Step 2: Handle Complex Questions

#### Matrix Questions

**CRITICAL CHECKLIST:**
- [ ] Is it single-attribute or multi-attribute?
  - Single: NO "Column Attributes" section
  - Multi: HAS "Column Attributes" section with multiple attributes
- [ ] Extract Scale Points (becomes columns)
- [ ] Extract rows (explicit list)
- [ ] Extract Column Attributes (if present)
- [ ] Set correct type: `"matrix"` or `"matrix-multi-attribute"`
- [ ] Include `scalePoints` array in schema
- [ ] Include `attributes` array (if multi-attribute)
- [ ] **Set validation: `requireAllRows: true`** (DEFAULT - all rows must be answered)

**See:** `../shared/matrix-question-guide.md` for detailed instructions.

#### Ranking Questions

**CHECKLIST:**
- [ ] Extract all items to be ranked
- [ ] Determine if partial ranking allowed (top N only)
- [ ] Set validation: require all items ranked OR top N
- [ ] Choose display: drag-and-drop OR dropdown selectors
- [ ] Randomization rules (if any)

#### "Other (Please Specify)" Options

**CRITICAL - COMMON PATTERN:**

Many questions include "Other (please specify)" options that reveal a text input when selected.

**Detection Patterns:**
- "Other (please specify)"
- "Other (specify)"
- "Other: ___________" (underscores indicate text field)
- "Something else (explain)"
- "Prefer to self-describe"

**CHECKLIST:**
- [ ] Identify "Other" option in option list
- [ ] Set `hasOtherOption: true` on the option
- [ ] Set `otherInputRequired: true` (default - text required when selected)
- [ ] Add `otherInputPlaceholder` text (e.g., "Please specify")
- [ ] Set `otherInputMaxLength` (50-100 for short, 200+ for detailed)
- [ ] Place "Other" near end of list (before "None/Prefer not to say")
- [ ] Ensure option has unique ID (commonly "99" or "98")

**Schema Example:**
```typescript
{
  id: "99",
  label: "Other (please specify)",
  hasOtherOption: true,
  otherInputRequired: true,
  otherInputPlaceholder: "Please specify",
  otherInputMaxLength: 100
}
```

**See**: `../shared/other-option-spec.md` for complete implementation details

### Step 3: Handle Logic and Routing

For every question, check for:

- [ ] **Default navigation**: Where does this question go by default?
  - Add: `navigation: { default: "Q#" }`
- [ ] **Conditional logic**: Are there skip patterns?
  - Add: `logic: [{ condition: "...", target: "..." }]`
- [ ] **Show conditions**: Should this question be shown conditionally?
  - Add: `showCondition: "..."`
- [ ] **Randomization**: Should options be randomized?
  - Add: `metadata: { randomize: true, anchor: [99, 999] }` // Option IDs to keep at end
- [ ] **Dynamic options**: Do options come from a previous question?
  - Add to metadata: `pipeOptionsFrom: { sourceQuestionId: 'Q#', generateFrom: 'selected_options', excludeValues: ['none', 'other'], includeOtherText: true }`
  - Keep `options: []` empty - generated at runtime
  - Supports chaining (Q9 → Q10 → Q11) automatically
- [ ] **Piping**: Does question text reference another question?
  - Convert all piping patterns to `[INSERT Q#]` or `[INSERT Q# LABEL]`

### Step 4: Handle Validation Rules

For every question that requires input, specify validation:

- [ ] **🚨 MANDATORY: ALL questions must be required** - Set `required: true` for EVERY question
  - **Exception**: Informational screens only (Introduction, Termination, Thank You)
  - **Rule**: Every question in the survey sequence MUST be answered
  - **Why**: Data quality, sample integrity, statistical validity
- [ ] **Min/max selections** (for multiple choice): Set `minSelections: 1`, `maxSelections` (if specified)
- [ ] **Character limits** (for text): Set `minLength`, `maxLength`
- [ ] **Numeric range** (for numbers): Set `min`, `max`
- [ ] **Pattern matching** (for email/phone): Set `pattern`
- [ ] **All rows required** (for matrix): Set `requireAllRows: true` (MANDATORY - all rows must be answered)

#### Text Input Validation (CRITICAL)

**ALL text inputs and textareas MUST include whitespace validation:**

```typescript
{
  required: true,
  minLength: 1,              // After trimming
  maxLength: 100,            // Before trimming (prevent abuse)
  trimWhitespace: true,      // DEFAULT: Always trim on blur and submit
  rejectWhitespaceOnly: true // DEFAULT: Reject "   " or empty after trim
}
```

**Rules**:
- Automatically trim leading/trailing whitespace on blur
- Automatically trim before form submission
- Reject whitespace-only input (spaces, tabs, newlines)
- Calculate min/max length AFTER trimming
- Show error: "Please enter a valid response (not just spaces)"

**This applies to**:
- Text Input (short text)
- Text Area (long text)
- "Other (please specify)" text inputs

**Why This Matters**:
- Prevents empty/meaningless responses
- Improves data quality
- Prevents respondents from gaming the system
- Standard practice in professional surveys

#### Selection Validation Timing (CRITICAL)

**Common Bug**: User selects option but validation shows "Please select an option" - FALSE ERROR!

**Root Cause**: Validation runs BEFORE selection state updates (race condition).

**Solution - Always Wait for State Update**:

```javascript
// ❌ WRONG - Causes false errors
function handleNextClick() {
  if (!validateForm()) {  // Runs too early!
    showError();
  }
}

// ✅ CORRECT - Wait for state update
function handleNextClick() {
  requestAnimationFrame(() => {
    if (!validateForm()) {
      showError();
      return;
    }
    submitForm();
  });
}
```

**Rules for ALL Choice Questions** (Radio, Checkbox, Matrix):
- **NEVER validate synchronously** on button click
- **Always use** `requestAnimationFrame()` or `setTimeout(fn, 0)`
- **Clear errors immediately** when option selected
- **Prevent double-click** with `isSubmitting` flag

**React-Specific**:
```javascript
// setState is async - use callback or useEffect
setState({ selected: optionId }, () => {
  // Validation after state update
});

// OR wait before validating
requestAnimationFrame(() => validateForm());
```

**This Fixes**:
- "Please select an option" when option IS selected
- "Please select at least one" when checkboxes ARE checked
- "Please answer all rows" when matrix IS complete

**See**: `survey-components-spec.md` (Radio Button & Checkbox sections) for implementation details

#### No Auto-Selection (CRITICAL)

**NEVER auto-select any option in any question type!**

**Why This is Critical**:
- Auto-selection creates response bias
- Skews data toward pre-selected options
- Respondents may not notice what's already selected
- Invalidates survey results
- Violates professional survey standards

**Rules for ALL Question Types**:

**Radio Buttons**:
- All options start unchecked
- No default selection
- Initial state: `selectedOption = null`

**Checkboxes**:
- All checkboxes start unchecked
- No pre-checked options
- Initial state: `selectedOptions = []`

**Dropdowns**:
- Show placeholder initially (e.g., "Select an option")
- No option pre-selected
- Initial state: `selectedValue = null`
- First `<option>` must be disabled placeholder

**Matrix Questions**:
- All cells start empty
- No default ratings
- Initial state: `matrixResponses = {}`

**Rating Scales / Sliders**:
- No default rating position
- Slider starts unset or at neutral position (if neutral exists)
- Initial state: `rating = null`

**Implementation Check**:
```javascript
// ✅ CORRECT - All start empty
useState(null)              // Single choice
useState([])                // Multiple choice
useState({})                // Matrix
useState(null)              // Dropdown

// ❌ WRONG - Pre-selected
useState("option1")         // ❌ Don't do this!
useState(["option1"])       // ❌ Don't do this!
useState({ row1: "col1" })  // ❌ Don't do this!
```

**Exception**: NONE. There are no valid cases for auto-selection in surveys.

---

## Post-Generation Phase

### Step 1: Verification Against Master List

**CRITICAL**: Before considering generation complete, verify EVERY question:

```
✅ INTRO1 - Generated
✅ SCR1 - Generated
✅ SCR2 - Generated
✅ SCR3 - Generated
...
✅ THANK1 - Generated

Total in Questionnaire: 25
Total Generated: 25
✅ ALL QUESTIONS ACCOUNTED FOR
```

### Step 2: Question Type Verification

For each question, verify correct type assignment:

- [ ] All matrix questions have `scalePoints` array
- [ ] All multi-attribute matrices have `attributes` array
- [ ] All choice questions have `options` array
- [ ] All text questions have `maxLength` or placeholder
- [ ] All ranking questions have complete item list
- [ ] All introduction/thank you screens have NO input fields

### Step 3: Logic Chain Verification

Verify the survey flow makes sense:

- [ ] Every question has a `default` navigation target (except terminations)
- [ ] All logic conditions reference valid question IDs
- [ ] All `pipeOptionsFrom.sourceQuestionId` reference valid source questions
- [ ] No circular references (Q1 → Q2 → Q1)
- [ ] Termination screens have no navigation targets
- [ ] Thank you screens have no navigation targets

### Step 4: Schema Completeness Check

Every question in the schema must have:

```typescript
{
  id: string,              // ✅ Required
  type: string,            // ✅ Required
  text: string,            // ✅ Required
  sectionId: string,       // ✅ Required

  // Type-specific (if applicable):
  options?: Option[],      // For choice questions
  columns?: Column[],      // For matrix questions
  rows?: Row[],           // For matrix questions
  scalePoints?: string[], // For matrix/scale questions
  attributes?: string[],   // For multi-attribute matrix

  // Optional but important:
  validation?: ValidationRules,
  navigation?: NavigationRules,
  logic?: LogicRule[],
  showCondition?: string,
  metadata?: {
    randomize?: boolean,     // Randomize options
    anchor?: number[],       // Anchor these option IDs at end
    exclusiveOptions?: number[],
    pipeOptionsFrom?: {      // Dynamic option piping
      sourceQuestionId: string,
      generateFrom: 'selected_options' | 'all_options',
      excludeValues?: (string | number)[],
      includeOtherText?: boolean
    },
    // ... other metadata fields
  },
  notes?: string[]
}
```

### Step 5: Validation Requirements Check (CRITICAL)

**🚨 MANDATORY**: Verify ALL questions have required validation:

```typescript
// ✅ CORRECT - Every question must have this
{
  id: "Q1",
  type: "single_choice",
  text: "What is your age?",
  options: [...],
  validation: {
    required: true  // MANDATORY
  }
}

// ❌ WRONG - Missing validation or required: false
{
  id: "Q2",
  type: "single_choice",
  text: "...",
  options: [...]
  // Missing validation object!
}
```

**Verification Checklist**:

- [ ] **ALL questions have `validation: { required: true }`**
  - Exception: Introduction, Termination, Thank You screens ONLY
- [ ] **Multiple choice questions** have `minSelections: 1` (or higher if specified)
- [ ] **Matrix questions** have `requireAllRows: true`
- [ ] **Text inputs** have `trimWhitespace: true` and `rejectWhitespaceOnly: true`
- [ ] **"Other" options** have validation for text input when selected

**Count Verification**:
```
Total questions in survey: 25
Total with required: true: 23  (excluding INTRO1, THANK1)
✅ VALIDATION COMPLETE
```

**Why This Matters**:
- Ensures complete responses for every question
- Prevents partial/incomplete survey submissions
- Maintains data quality and statistical validity
- Professional survey standard

### Step 6: Component Rendering Test

After generation, verify components can render:

- [ ] Run the dev server: `HOSTNAME=0.0.0.0 PORT=3001 npm run dev`
- [ ] Navigate to survey page
- [ ] Verify ALL questions display
- [ ] Check for console errors
- [ ] Verify matrix tables render correctly
- [ ] Test collapsible sections
- [ ] Verify all badges display
- [ ] Check metadata rows present

---

## Common Reasons Questions Get Missed

### Reason 1: Ambiguous Question Format

**Problem**: Question doesn't clearly fit a standard type.

**Example**:
```
Q10: What do you think about our product?
[ Short text box ]
```

**Solution**: Make best guess and add note:
```typescript
{
  id: "Q10",
  type: "text_input", // Best guess: short response
  text: "What do you think about our product?",
  validation: { maxLength: 200 },
  notes: ["Unclear if short or long response intended - using short text"]
}
```

### Reason 2: Question Embedded in Instructions

**Problem**: Question hidden in paragraph text.

**Example**:
```
"We'd like to understand your preferences. Please tell us which
features matter most to you when choosing a smartphone."

☐ Battery life
☐ Camera quality
☐ Screen size
```

**Solution**: Extract as proper question:
```typescript
{
  id: "Q5",
  type: "multiple_choice",
  text: "Which features matter most to you when choosing a smartphone?",
  options: [...]
}
```

### Reason 3: Follow-Up Questions

**Problem**: Conditional follow-up questions easy to miss.

**Example**:
```
Q8: Have you ever used our product?
○ Yes
○ No

[IF YES, ask Q9]
Q9: How satisfied were you?
```

**Solution**: Always check for "IF...", "If respondent...", "Ask only if..." patterns.

### Reason 4: Matrix Questions Split Across Pages

**Problem**: Matrix structure spans multiple pages/sections.

**Example**:
```
Page 5:
"For each brand, rate the following attributes:"

Page 6:
[Table with brands and ratings]
```

**Solution**: Look for continuation patterns, read entire questionnaire before parsing.

### Reason 5: Implicit Questions

**Problem**: Question implied but not explicitly stated.

**Example**:
```
Section 3: Demographics

Age: _______
Gender: _______
Location: _______
```

**Solution**: Create explicit questions:
```typescript
{ id: "DEM1", type: "numeric_input", text: "What is your age?" }
{ id: "DEM2", type: "single_choice", text: "What is your gender?" }
{ id: "DEM3", type: "text_input", text: "What is your location?" }
```

---

## Emergency Handling: When You Can't Parse a Question

If you encounter a question you absolutely cannot parse correctly:

### Option 1: Generate as Text Question with Note

```typescript
{
  id: "Q??",
  type: "text_area",
  text: "[ORIGINAL QUESTION TEXT FROM QUESTIONNAIRE]",
  validation: { required: false },
  notes: [
    "⚠️ REQUIRES MANUAL REVIEW",
    "Original format unclear - defaulted to open text",
    "Original questionnaire context: [explain]"
  ]
}
```

### Option 2: Add Placeholder and Flag

```typescript
{
  id: "Q??",
  type: "NEEDS_REVIEW",
  text: "[ORIGINAL QUESTION TEXT]",
  notes: [
    "⚠️ PARSING FAILED",
    "Reason: [explain why]",
    "Suggestions: [suggest possible types]"
  ]
}
```

### Option 3: Ask User for Clarification

Use `AskUserQuestion` tool:

```typescript
"I found a question in your questionnaire that I need clarification on:

[Question text from questionnaire]

How should this question be formatted?"

Options:
- Single choice (select one answer)
- Multiple choice (select multiple answers)
- Matrix/grid (rate multiple items)
- Text input (open-ended)
- Other (please specify)
```

**BUT**: Only ask if absolutely necessary. Default to a reasonable guess with notes first.

---

## Final Verification Report

After generation, output a completion report:

```
SURVEY GENERATION COMPLETE

Questionnaire: Customer Satisfaction Survey
Input File: user_files/questionnaire.md

QUESTIONS PARSED:
✅ Section 1: Demographics (5/5 questions)
✅ Section 2: Product Usage (8/8 questions)
✅ Section 3: Brand Perceptions (10/10 questions)
✅ Section 4: Closing (2/2 questions)

TOTAL: 25/25 questions successfully generated

QUESTION TYPE BREAKDOWN:
- Introduction Screen: 1
- Single Choice: 8
- Multiple Choice: 5
- Matrix (single-attribute): 3
- Matrix (multi-attribute): 2
- Ranking: 1
- Text Input: 2
- Text Area: 4
- Rating Scale: 2
- Slider (NPS): 1
- Thank You Screen: 1

LOGIC & ROUTING:
- Default navigation: 25 rules
- Conditional logic: 12 rules
- Show conditions: 8 rules
- Dynamic options: 5 rules
- Randomization: 3 questions with randomized options

VALIDATION APPLIED:
- Required questions: 22
- Optional questions: 3
- Character limits: 6
- Selection limits: 3
- Numeric ranges: 2

⚠️ ITEMS NEEDING REVIEW:
None

✅ ALL CHECKS PASSED - Ready for hosted implementation
```

---

## Continuous Verification During Generation

Don't wait until the end. Verify as you go:

### After Parsing Each Section:
```
✅ Section 1 parsed: 5 questions identified
  - INTRO1 (Introduction Screen) ✅
  - SCR1 (Single Choice) ✅
  - SCR2 (Single Choice) ✅
  - SCR3 (Dropdown) ✅
  - SCR4 (Single Choice) ✅

Moving to Section 2...
```

### Keep Running Count:
```
Questions Generated: 5/25 (20%)
Questions Generated: 13/25 (52%)
Questions Generated: 23/25 (92%)
Questions Generated: 25/25 (100%) ✅
```

---

## Quality Over Speed

**REMEMBER**:
- Taking time to parse correctly > rushing and missing questions
- Simple correct format > complex incorrect format
- Generating with notes for review > skipping questions
- 100% question coverage > perfect formatting for 80% of questions

---

## Best Practices

1. **Read entire questionnaire first** before generating anything
2. **Create master list** of all questions upfront
3. **Parse sequentially** - don't skip around
4. **Check off each question** as you generate it
5. **Verify totals match** before marking complete
6. **Test rendering** before finalizing
7. **Document uncertainties** in notes fields
8. **Never skip a question** - generate in simple format if needed

---

## Related Documentation

- **../shared/matrix-question-guide.md**: Detailed matrix question handling
- **survey-generation-guide.md**: General generation process
- **../shared/survey-question-types.md**: All question type specifications
- **QUICK-REFERENCE.md**: Quick lookup for formatting

---

**GOLDEN RULE**: If you're unsure about a question format, generate it as a simple text question with a note for manual review. NEVER skip a question entirely.

---

## Final Production Mode Check

**If `NEXT_PUBLIC_DEPLOYMENT=production`, verify database setup:**

```bash
# Check MONGODB_URI exists
grep MONGODB_URI .env.local

# Check MongoDB is running
pgrep mongod || brew services list | grep mongodb

# Generate Prisma client if needed
npx prisma generate
```

**Required for production:**
- [ ] `MONGODB_URI` configured in `.env.local`
- [ ] MongoDB installed and running
- [ ] Prisma client generated
- [ ] Database connection verified

**Skip if development mode only (`NEXT_PUBLIC_DEPLOYMENT=development`)**

---

## 🚨 CRITICAL: QA Verification Protocol (NON-NEGOTIABLE)

**This section is MANDATORY. A survey is NOT complete until ALL QA checks pass.**

### Rule 1: NEVER Mark Complete with Known Failures

**NEVER mark a task as "completed" or "successful" if ANY requirement from the questionnaire is not working correctly.**

If during testing you observe:
- A feature not working as specified in the questionnaire
- Logic/routing behaving differently than documented
- Questions showing when they shouldn't (or vice versa)
- Dynamic piping not filtering correctly
- Validation not enforcing requirements
- ANY deviation from questionnaire specification

**You MUST:**
1. **STOP** - Do not proceed with other tasks
2. **DOCUMENT** - Note all breaking scenarios observed
3. **FIX** - Address all issues before marking complete
4. **RE-TEST** - Verify fixes work correctly
5. **ONLY THEN** - Mark the task as complete

### Rule 2: Observe ALL Breaking Scenarios First

When you find one issue, **systematically test for related issues** before fixing:

```
BREAKING SCENARIO DISCOVERY PROCESS:

1. Document ALL Issues Found:
   Issue 1: Q13 pipeRowsFrom not filtering by answer value
   Issue 2: [any other issues found]
   Issue 3: [any other issues found]

2. Fix ALL Issues
3. Re-test the breaking scenario
4. THEN mark complete when all scenerios tested
```

### Rule 3: Test Against Questionnaire Requirements

**For every question, verify it matches the questionnaire specification EXACTLY:**

| Questionnaire Says | Test For |
|-------------------|----------|
| "Only show if Q11 = Familiar" | Verify question ONLY shows when Q11 response is 'familiar' |
| "TERMINATE if not X" | Verify termination screen shows for non-X responses |
| "Randomize options, anchor Other" | Verify options randomize but "Other" stays at bottom |
| "Sum to 100%" | Verify validation rejects values not summing to 100 |
| "Min 10 characters" | Verify < 10 chars shows error |

### Rule 4: Breaking Test Examples

**Always test these scenarios:**

1. **Termination Paths**: Select each terminating option → verify termination
2. **Conditional Questions**: Answer source question → verify target shows/hides correctly
3. **Dynamic Piping**: 
   - Select specific options in source → verify ONLY those appear in target
   - Change source answers → verify target updates
4. **Matrix Validation**: Leave rows unanswered → verify error appears
5. **Exclusive Options**: Select "None" → verify other selections clear
6. **Skip Logic**: Answer with skip condition → verify correct destination

### Rule 5: What "Complete" Actually Means

A survey is ONLY complete when:

- [ ] **ALL questions** from questionnaire are implemented
- [ ] **ALL termination logic** routes to termination correctly
- [ ] **ALL conditional logic** shows/hides questions correctly
- [ ] **ALL dynamic piping** filters options/rows based on actual answer VALUES
- [ ] **ALL validation rules** are enforced
- [ ] **Happy path** completes to thank you screen
- [ ] **At least one termination path** verified
- [ ] **No console errors** during survey flow
- [ ] **Every feature** matches questionnaire specification EXACTLY

### Example: How NOT to Handle Issues

```
❌ WRONG:
"Q13 showed all suppliers instead of just familiar ones. 
The survey structure is correct though. Marking as complete."

✅ RIGHT:
"Q13 showed all suppliers instead of just familiar ones.
This is a BREAKING issue - the questionnaire requires filtering by Q11 value.

STOPPING to:
1. Document this issue
2. Check for similar issues in other questions
3. Fix the generateDynamicRows function to support filtering by answer value
4. Re-test Q13 with various Q11 responses
5. Verify fix doesn't break other dynamic piping
6. THEN mark complete"
```

### Verification Checklist (Run Before Marking Complete)

```
QA VERIFICATION CHECKLIST:

□ All termination paths tested and working
□ All conditional show/hide logic verified  
□ All dynamic piping filtering correctly by:
  □ Selected options (for multiple choice sources)
  □ Answer values (for matrix sources) ← CRITICAL
  □ Exclusion rules (excludeValues working)
□ All matrix questions requiring all rows
□ All validation rules enforcing correctly
□ Happy path reaches completion
□ No features "noted for later" - all fixed NOW
□ No "works mostly" - must work EXACTLY as specified

ONLY CHECK THIS BOX IF ALL ABOVE ARE TRUE:
□ Survey is COMPLETE and matches questionnaire specification
```

---
