# Survey Logic & Routing Specification

This document defines how to handle and display survey logic, skip patterns, branching, and conditional display.

**Reference**: Works with all other survey specification documents

---

## Logic Types

1. **Navigation Logic** - Where to go next
2. **Display Logic** - When to show/hide questions
3. **Validation Logic** - Input requirements
4. **Randomization Logic** - Order randomization
5. **Piping Logic** - Dynamic text insertion
6. **Quota Logic** - Sample management

---

## 1. Navigation Logic

### 1.1 Default Navigation

**Purpose**: Standard next question routing

**Badge Format**: `Default → [TargetID]`

**Badge Styling**:
- Background: `#3D1C35` (Maroon)
- Text: `#FFFFFF`
- Icon: Arrow (→)

**Example**:
```
[Default → SCR2]
```

**Behavior**:
- When no conditions are met, go to target
- Always present unless it's the last question
- Displayed in metadata row

**Implementation**:
```json
{
  "defaultTarget": "SCR2"
}
```

---

### 1.2 Conditional Navigation

**Purpose**: Route based on response

**Badge Format**: `IF [condition] → [TargetID]`

**Badge Styling**:
- Background: `#3D1C35` (Maroon)
- Text: `#FFFFFF`

**Example**:
```
[IF response = [1, 6, 7] → TERM1]
```

**Condition Formats**:

**Exact Match**:
```
IF response = [1] → Q5
IF response = "Yes" → Q10
```

**Multiple Values**:
```
IF response = [1, 6, 7] → TERM1
IF response in ["Option A", "Option B"] → Q8
```

**Range**:
```
IF response > 5 → Q15
IF response >= 18 AND response <= 65 → Q20
```

**Multiple Conditions**:
```
IF response = [1] AND Q2 = [3] → Q25
IF response = [1] OR response = [2] → Q30
```

**Behavior**:
- Evaluate conditions in order
- First matching condition wins
- If no conditions match, use default navigation
- Multiple conditional badges can exist per question

**Implementation**:
```json
{
  "conditionalLogic": [
    {
      "condition": "response in [1, 6, 7]",
      "target": "TERM1"
    },
    {
      "condition": "response = [2, 3, 4, 5]",
      "target": "SCR2"
    }
  ],
  "defaultTarget": "SCR2"
}
```

---

### 1.3 Termination Logic

**Purpose**: End survey based on response

**Badge Format**: `IF [condition] → TERM1`

**Example**:
```
[IF response = [1] → TERM1]
```

**Behavior**:
- Navigate to termination screen
- End survey flow
- Display termination message

**Common Termination Reasons**:
- Age disqualification
- Location disqualification
- Quota full
- Screening failure

---

### 1.4 Skip Logic

**Purpose**: Skip questions based on previous answers

**Badge Format**: `IF [condition] → SKIP to [TargetID]`

**Example**:
```
[IF Q1 = "No" → SKIP to Q10]
```

**Behavior**:
- Jump over irrelevant questions
- Don't display skipped questions
- Maintain survey flow

---

## 2. Display Logic (Show/Hide Conditions)

### 2.1 Show Condition

**Purpose**: Display question only when condition is met

**Badge Format**: `Show Condition: [condition]`

**Badge Styling**:
- Background: `#FFFFFF`
- Border: `1px solid #FF9800`
- Text: `#FF9800`
- Icon: Eye (👁)

**Example**:
```
[👁 Show Condition: BA3 != 99]
```

**Condition Formats**:

**Not Equal**:
```
Show Condition: BA3 != 99
Show Condition: Q1 != "None"
```

**Equal**:
```
Show Condition: Q1 = "Yes"
Show Condition: SCR1 = [2, 3, 4]
```

**Contains**:
```
Show Condition: Q5 contains "Apple"
Show Condition: Q5 contains [1, 2]
```

**Multiple Conditions**:
```
Show Condition: Q1 = "Yes" AND Q2 > 5
Show Condition: Q1 = "Yes" OR Q2 = "Maybe"
```

**Behavior**:
- Question is hidden by default
- Only shown when condition evaluates to true
- Re-evaluate on every answer change
- Clear answers if question becomes hidden

**Implementation**:
```json
{
  "showCondition": {
    "operator": "!=",
    "left": "BA3",
    "right": 99
  }
}
```

---

### 2.2 Hide Condition

**Purpose**: Hide question when condition is met

**Badge Format**: `Hide Condition: [condition]`

**Example**:
```
[Hide Condition: Q1 = "No"]
```

**Behavior**:
- Question is shown by default
- Hidden when condition evaluates to true
- Opposite of show condition

---

## 3. Randomization Logic

### 3.1 Randomize Options

**Purpose**: Randomize order of answer options

**Badge Format**: `Randomized (anchored: [numbers])`

**Badge Styling**:
- Background: `#3D1C35` (Maroon)
- Text: `#FFFFFF`
- Icon: Shuffle (🔀)

**Example**:
```
[🔀 Randomized (anchored: 6, 99)]
```

**Anchored Options**:
- Specific options remain in fixed positions
- Usually "Other", "None of the above", "Don't know"
- Listed in badge

**Example with Anchoring**:
```
Original:
1. Apple
2. Samsung
3. Google
4. OnePlus
5. Xiaomi
6. Other (specify)
99. None of the above

Randomized (anchored: 6, 99):
3. Google
1. Apple
5. Xiaomi
2. Samsung
4. OnePlus
6. Other (specify)      ← Anchored
99. None of the above   ← Anchored
```

**Behavior**:
- Randomize on page load
- Keep same order for respondent throughout survey
- Anchor specified options at end
- Store both original and randomized order

**Schema (types/survey.ts)**:
```typescript
{
  type: "single_choice", // or "multiple_choice"
  options: [...],
  metadata: {
    randomize: true,      // Enable randomization
    anchor: [6, 99]       // Option IDs to keep at end (array of numbers)
  }
}
```

**Example from sample-survey.ts**:
```typescript
metadata: {
  randomize: true,
  anchor: [7],  // Option 7 stays at bottom
  exclusiveOptions: [7]  // Can combine with exclusive options
}
```

---

### 3.2 Randomize Questions

**Purpose**: Randomize order of questions within section

**Badge Format**: `Question Order Randomized`

**Example**:
```
[Question Order Randomized]
```

**Behavior**:
- Randomize question order within section
- Maintain dependencies (don't randomize if logic depends on order)
- Keep same order for respondent throughout survey

---

### 3.3 Randomize Rows (Matrix)

**Purpose**: Randomize row order in matrix questions

**Badge Format**: `Rows Randomized (anchored: [numbers])`

**Example**:
```
[Rows Randomized (anchored: 99)]
```

**Behavior**:
- Randomize row order in matrix
- Anchor specific rows (e.g., "None of the above")
- Keep same order for respondent

---

### 3.4 Randomize Columns (Matrix)

**Purpose**: Randomize column order in matrix questions

**Badge Format**: `Columns Randomized`

**Example**:
```
[Columns Randomized]
```

**Behavior**:
- Randomize column order in matrix
- Typically for attribute lists
- Keep same order for respondent

---

## 4. Dynamic Options Logic

### 4.1 Dynamic Options from Previous Question

**Purpose**: Use selected options from previous question as options

**Badge Format**: `Dynamic Options from: [SourceID]`

**Badge Styling**:
- Background: `E0BFD8` (Cyan)
- Text: `#FFFFFF`
- Icon: Link (🔗)

**Example**:
```
[🔗 Dynamic Options from: BA4]
```

**Behavior**:
- Pull selected options from source question
- Display only those options in current question
- If source has no selections, may show error or skip question

**Use Cases**:
- "You selected [brands]. Which is your favorite?"
- "Rate each of the features you selected"
- Follow-up questions on previous selections

**Implementation**:
```json
{
  "dynamicOptions": {
    "sourceQuestionId": "BA4",
    "type": "selected"
  }
}
```

---

### 4.2 Dynamic Options from Data Source

**Purpose**: Load options from external data

**Badge Format**: `Dynamic Options from: [DataSource]`

**Example**:
```
[Dynamic Options from: CountryList]
```

**Use Cases**:
- Country lists
- State/province lists
- Product catalogs
- Brand lists

---

## 5. Piping Logic

### 5.1 Text Piping (Dynamic Text Substitution)

**Purpose**: Insert previous answers dynamically into question text, creating personalized survey experiences.

#### Supported Piping Patterns

**1. Raw Response Value**: `[INSERT QUESTIONID]` or `[INSERT QUESTIONID RESPONSE]`
   - Returns the actual answer value entered/selected by respondent
   - For text questions: returns exact text entered
   - For single choice: returns option ID or value (e.g., "1", "yes")
   - For multiple choice: returns comma-separated values (e.g., "1, 3, 5")
   - Example: `[INSERT Q1]` → `"banana"` or `[INSERT Q4 RESPONSE]` → `"apple, orange, grape"`

**2. Option Label Piping**: `[INSERT QUESTIONID LABEL]`
   - Returns the display label(s) of selected option(s) instead of raw values
   - For single choice: returns one label (e.g., "Strongly Agree")
   - For multiple choice: returns comma-separated labels (e.g., "Apple, Samsung, Google")
   - More user-friendly than raw values
   - Example: `[INSERT Q1 LABEL]` → `"Strongly Agree"` instead of `"5"`

**3. Specific Option Reference**: `[INSERT QUESTIONID.OPTIONID]`
   - Reference a specific option's label from a question
   - Useful when you need to reference one option from a multi-select
   - Example: `[INSERT Q2.1]` → Returns label of option 1 from Q2

**4. Count/Aggregate Piping**:
   - `[INSERT QUESTIONID.COUNT]` - Number of options selected
   - `[INSERT QUESTIONID.SUM]` - Sum of numeric values (for calculations)
   - `[INSERT QUESTIONID.FIRST]` - First selected option
   - `[INSERT QUESTIONID.LAST]` - Last selected option
   - Example: `"You selected [INSERT Q4.COUNT] brands"` → `"You selected 3 brands"`

**5. Metadata Piping**:
   - `[INSERT RESPONDENT.NAME]` - Respondent's name (if collected)
   - `[INSERT RESPONDENT.EMAIL]` - Respondent's email
   - `[INSERT VARIABLE.VARNAME]` - Hidden/computed variable value

#### Questionnaire Pattern Detection (CRITICAL)

**When parsing questionnaires, you MUST detect and convert ALL these patterns to standard format:**

Common patterns used in questionnaire documents:
- `{{Q1}}`, `{Q1}` → Convert to `[INSERT Q1]`
- `[Q1]`, `<Q1>`, `$Q1$` → Convert to `[INSERT Q1]`
- `"INSERT Q1 RESPONSE"` → Convert to `[INSERT Q1]`
- `"PIPE Q1"`, `"SHOW Q1"` → Convert to `[INSERT Q1]`
- `{{Q1 label}}`, `{Q1 option}` → Convert to `[INSERT Q1 LABEL]`
- `"INSERT Q1 OPTION TEXT"` → Convert to `[INSERT Q1 LABEL]`

**Example Conversions:**
```
Questionnaire Format         →    Standard Schema Format
─────────────────────────────────────────────────────────────
"You said {{Q1}}"            →    "You said [INSERT Q1]"
"You chose {Q5 option}"      →    "You chose [INSERT Q5 LABEL]"
"Based on <Q2 answer>"       →    "Based on [INSERT Q2]"
"Total: $Q4 sum$"            →    "Total: $[INSERT Q4.SUM]"
"[Show Q3 response here]"    →    "[INSERT Q3]"
"PIPE Q1 RESPONSE"           →    "[INSERT Q1]"
```

#### Example in Question Schema

```typescript
// Raw value piping
{
  id: 'Q5',
  type: 'text_area',
  text: "You mentioned [INSERT Q1]. Can you elaborate on why you chose that?",
}

// Label piping (shows "Strongly Agree" instead of value "5")
{
  id: 'Q6',
  type: 'text_area',
  text: "You selected [INSERT Q1 LABEL]. Can you explain why?",
}

// Multiple choice label piping
{
  id: 'Q7',
  type: 'single_choice',
  text: "You selected [INSERT Q4 LABEL]. Which one do you use most often?",
  dynamicOptions: "Q4"  // Use selected brands from Q4 as options
}

// Count piping
{
  id: 'Q8',
  type: 'text_area',
  text: "You selected [INSERT Q4.COUNT] brands. Why did you choose these specific ones?",
}

// Complex multi-piping
{
  id: 'Q9',
  type: 'rating_scale',
  text: "You rated [INSERT Q1 LABEL] as your primary choice and [INSERT Q3 LABEL] as backup. How confident are you in this decision?",
}
```

#### Runtime Behavior

**Authoring View (Questionnaire Display)**:
- Show piping patterns in original form with light highlight
- Example: "You said [INSERT Q1]" displays with `[INSERT Q1]` highlighted
- Helps designers see where piping occurs

**Respondent View (Hosted Survey)**:
- Replace patterns with actual values in real-time
- Update immediately when referenced question is answered
- If question not yet answered: show `[No response]` or leave blank
- If question was skipped: show `[No response]`
- Handle missing data gracefully

**Example Flow:**
```
Q1: "What is your favorite fruit?"
Respondent answers: "Mango"

Q2: "You said [INSERT Q1]. Why is this your favorite?"
Displays as: "You said Mango. Why is this your favorite?"

If Q1 was skipped:
Displays as: "You said [No response]. Why is this your favorite?"
```

#### Piping in Different Question Elements

Piping can be used in:
- ✅ Question text (most common)
- ✅ Option labels (less common, but supported)
- ✅ Placeholder text in text inputs
- ✅ Help text / instructions
- ✅ Validation error messages
- ❌ Question IDs (not supported)
- ❌ Logic conditions (use actual question references)

**Example - Piping in Options:**
```typescript
{
  id: 'Q10',
  type: 'single_choice',
  text: "How would you compare these options?",
  options: [
    { id: "1", label: "[INSERT Q1 LABEL] is better" },
    { id: "2", label: "[INSERT Q2 LABEL] is better" },
    { id: "3", label: "Both are equally good" }
  ]
}
```

#### Implementation Details

**Piping Function Signature:**
```typescript
function applyPiping(
  text: string,
  responses: Record<string, any>,
  allQuestions: Question[]
): string {
  // 1. Find all [INSERT ...] patterns in text
  // 2. Extract question ID and piping type (RESPONSE/LABEL/COUNT/etc)
  // 3. Look up answer from responses
  // 4. Look up question/option details from allQuestions
  // 5. Format and replace pattern with actual value
  // 6. Return transformed text
}
```

**Key Implementation Rules:**
- Parse patterns case-insensitively
- Handle nested brackets gracefully
- Preserve spacing around replaced values
- Cache question lookups for performance
- Re-apply piping on any answer change

---

### 5.2 Loop Piping (Question Repetition)

**Purpose**: Automatically generate and repeat questions for each selected option from a previous multi-select question.

**Format**: `{{LOOP.ITEM}}` or `[LOOP ITEM]`

**Use Cases**:
- Rate each selected brand individually
- Describe experience with each selected feature
- Collect detailed feedback on each chosen product

**Example in Questionnaire:**
```
Q5: Which smartphones have you used in the past year? (Select all that apply)
[ ] iPhone
[ ] Samsung Galaxy
[ ] Google Pixel
[ ] OnePlus
[ ] Other

Q6: [LOOP] Rate your satisfaction with {{LOOP.ITEM}}
Scale: 1 (Very Dissatisfied) to 5 (Very Satisfied)

Loop Source: Q5
```

**Example in Schema:**
```typescript
{
  id: 'Q6',
  type: 'rating_scale',
  text: "Rate your satisfaction with [LOOP ITEM]",
  loopSource: "Q5",  // Reference to multi-select question
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: {
    1: "Very Dissatisfied",
    5: "Very Satisfied"
  }
}
```

**Runtime Behavior:**
If respondent selected "iPhone", "Samsung Galaxy", and "Google Pixel" in Q5:

**Generated Questions:**
```
Q6a: Rate your satisfaction with iPhone
[1] [2] [3] [4] [5]

Q6b: Rate your satisfaction with Samsung Galaxy
[1] [2] [3] [4] [5]

Q6c: Rate your satisfaction with Google Pixel
[1] [2] [3] [4] [5]
```

**Response Storage:**
```typescript
{
  "Q6": {
    "iPhone": 5,
    "Samsung Galaxy": 4,
    "Google Pixel": 3
  }
}
```

**Implementation Notes:**
- Loop questions must follow the source question in survey flow
- Minimum 1 selection required in source question (or skip loop question)
- Maximum recommended: 10-12 loop iterations (UX consideration)
- Progress bar accounts for loop iterations
- Can pipe loop results in later questions: `[INSERT Q6.iPhone]` → `"5"`

---

### 5.3 Conditional Piping

**Purpose**: Show different piped text based on conditions

**Format**: Nested piping with conditions

**Example:**
```typescript
{
  id: 'Q15',
  type: 'text_area',
  text: "You selected [INSERT Q1 LABEL]. [IF Q1 = 1]Why do you prefer this option?[ELSE]What made you choose this?[ENDIF]",
}
```

**Simplified Alternative - Use Show Conditions:**
Instead of conditional piping, create multiple questions with show conditions:
```typescript
{
  id: 'Q15a',
  type: 'text_area',
  text: "You selected [INSERT Q1 LABEL]. Why do you prefer this option?",
  showCondition: "Q1 = 1"
},
{
  id: 'Q15b',
  type: 'text_area',
  text: "You selected [INSERT Q1 LABEL]. What made you choose this?",
  showCondition: "Q1 != 1"
}
```

---

## 6. Hidden Variables & Computed Values

### 6.1 Hidden Variables (Background Data Collection)

**Purpose**: Store values that are not directly asked in questions but are derived, calculated, or passed from external sources.

**Common Use Cases**:
1. **External Parameters**: URL parameters, embedded data from survey links
2. **Computed Values**: Calculations based on multiple answers
3. **Timestamps**: Recording when specific actions occurred
4. **Session Metadata**: Device type, browser, referrer
5. **Quota Tracking**: Current quota status, remaining slots
6. **A/B Test Groups**: Randomly assigned test conditions

#### Schema Structure

```typescript
{
  hiddenVariables: [
    {
      id: "var_source",            // Variable identifier
      name: "Traffic Source",       // Human-readable name
      type: "url_param",            // Variable type
      source: "utm_source",         // Source parameter name
      defaultValue: "direct"        // Fallback if not provided
    },
    {
      id: "var_total_spend",
      name: "Total Estimated Spend",
      type: "computed",
      formula: "SUM(Q10.selected_prices)", // Calculation formula
      computeOn: "Q10",             // Trigger calculation after this question
    },
    {
      id: "var_survey_start",
      name: "Survey Start Time",
      type: "timestamp",
      trigger: "survey_start"       // When to capture
    }
  ]
}
```

#### Variable Types

**1. URL Parameters** (`type: "url_param"`)
- Capture values from URL query strings
- Common for tracking campaign sources, respondent IDs
```typescript
{
  id: "var_campaign",
  type: "url_param",
  source: "campaign_id",        // ?campaign_id=spring2024
  defaultValue: "unknown"
}
```

**2. Embedded Data** (`type: "embedded"`)
- Pre-filled data passed from survey platform or CRM
- Used for panel providers, email campaigns
```typescript
{
  id: "var_panelist_id",
  type: "embedded",
  source: "pid",
  required: true                // Terminate if missing
}
```

**3. Computed Values** (`type: "computed"`)
- Calculate values based on answers
```typescript
{
  id: "var_total_cost",
  type: "computed",
  formula: "SUM(Q15.1, Q15.2, Q15.3) * 12", // Monthly to annual
  computeOn: "Q15",
  dataType: "number"
}
```

**4. Timestamps** (`type: "timestamp"`)
- Record when events occur
```typescript
{
  id: "var_completion_time",
  type: "timestamp",
  trigger: "survey_complete",
  format: "ISO8601"             // 2024-01-15T14:30:00Z
}
```

**5. Random Assignment** (`type: "random"`)
- Randomly assign to test groups
```typescript
{
  id: "var_test_group",
  type: "random",
  options: ["control", "variant_a", "variant_b"],
  weights: [0.33, 0.33, 0.34],  // Equal distribution
  trigger: "survey_start"        // Assign once at start
}
```

**6. Derived Categories** (`type: "derived"`)
- Categorize based on rules
```typescript
{
  id: "var_customer_segment",
  type: "derived",
  rules: [
    { condition: "Q5 >= 10000 AND Q6 = 'Yes'", value: "Premium" },
    { condition: "Q5 >= 5000 AND Q5 < 10000", value: "Standard" },
    { condition: "Q5 < 5000", value: "Basic" }
  ],
  computeOn: "Q6"
}
```

#### Computation Formulas

**Supported Operators:**
- Arithmetic: `+`, `-`, `*`, `/`, `%` (modulo)
- Comparison: `=`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `AND`, `OR`, `NOT`
- Functions: `SUM()`, `AVG()`, `COUNT()`, `MIN()`, `MAX()`, `IF()`, `ROUND()`

**Formula Examples:**
```typescript
// Simple arithmetic
formula: "Q10 + Q11 + Q12"

// With functions
formula: "AVG(Q5, Q6, Q7)"
formula: "SUM(Q8.selected_values)"
formula: "COUNT(Q9.selected_options)"

// Conditional
formula: "IF(Q5 > 1000, Q5 * 0.10, 0)"  // 10% if over 1000

// Complex
formula: "ROUND((SUM(Q10.selected_prices) * 1.15) / 12, 2)"  // Add 15% tax, divide by 12, round to 2 decimals
```

#### Using Hidden Variables

**In Piping:**
```typescript
{
  id: 'Q20',
  type: 'text_area',
  text: "Based on your selections, your estimated monthly cost is $[INSERT VARIABLE.var_total_cost]. Does this fit your budget?",
}
```

**In Logic Conditions:**
```typescript
{
  id: 'Q25',
  type: 'single_choice',
  text: "...",
  showCondition: "VARIABLE.var_customer_segment = 'Premium'"
}
```

**In Navigation:**
```typescript
{
  logic: {
    conditionalNavigation: [
      {
        condition: "VARIABLE.var_test_group = 'variant_a'",
        target: "Q30"
      },
      {
        condition: "VARIABLE.var_test_group = 'control'",
        target: "Q40"
      }
    ]
  }
}
```

#### Display in Authoring View

Hidden variables should be displayed in the survey metadata section:

```
[Survey Metadata]

Hidden Variables:
─────────────────────────────────────────
🔒 Traffic Source (var_source)
   Type: URL Parameter
   Source: utm_source
   Default: "direct"

🔢 Total Estimated Spend (var_total_spend)
   Type: Computed
   Formula: SUM(Q10.selected_prices)
   Trigger: After Q10

⏱️  Survey Start Time (var_survey_start)
   Type: Timestamp
   Trigger: Survey Start

🎲 Test Group (var_test_group)
   Type: Random Assignment
   Options: control (33%), variant_a (33%), variant_b (34%)
```

#### Response Storage

Hidden variables are stored alongside question responses:

```typescript
{
  responses: {
    "Q1": "Option A",
    "Q2": [1, 3, 5],
    // ... other question responses
  },
  hiddenVariables: {
    "var_source": "google_ads",
    "var_total_spend": 149.99,
    "var_survey_start": "2024-01-15T14:30:00Z",
    "var_test_group": "variant_a",
    "var_customer_segment": "Premium"
  }
}
```

#### Detection in Questionnaires

**When parsing questionnaires, look for these indicators:**

Explicit mentions:
- "Hidden Variable: [name]"
- "Background Data: [name]"
- "Computed Field: [formula]"
- "URL Parameter: [param_name]"

Implicit indicators:
- References to calculations not shown to respondent
- Mentions of "group assignment" or "test condition"
- External data sources mentioned
- "Record timestamp when..."

**Example from questionnaire:**
```
HIDDEN VARIABLES:
─────────────────
1. Campaign Source (from URL parameter: utm_campaign)
2. Total Service Cost = Sum of selected services from Q15
3. Customer Segment = IF total_spend > $5000 THEN "Premium" ELSE "Standard"

Q10: You mentioned your total budget is $[INSERT Q8].
Based on our calculations, your estimated cost is $[INSERT VARIABLE.Total Service Cost].
```

Convert to schema:
```typescript
{
  hiddenVariables: [
    {
      id: "var_campaign_source",
      type: "url_param",
      source: "utm_campaign",
      defaultValue: "unknown"
    },
    {
      id: "var_total_service_cost",
      type: "computed",
      formula: "SUM(Q15.selected_values)",
      computeOn: "Q15"
    },
    {
      id: "var_customer_segment",
      type: "derived",
      rules: [
        { condition: "var_total_service_cost > 5000", value: "Premium" },
        { condition: "var_total_service_cost <= 5000", value: "Standard" }
      ],
      computeOn: "Q15"
    }
  ]
}
```

#### Implementation Checklist

When implementing hidden variables:

- [ ] Define all hidden variables in survey schema
- [ ] Capture URL parameters on survey load
- [ ] Compute derived values after trigger questions
- [ ] Store in separate `hiddenVariables` object (not mixed with responses)
- [ ] Make accessible to piping engine
- [ ] Include in logic evaluation
- [ ] Submit to API with survey responses
- [ ] Never display raw values to respondent (unless explicitly piped)
- [ ] Validate formulas for syntax errors
- [ ] Handle missing dependencies gracefully

#### Common Patterns & Complete Implementation Examples

**PATTERN 1: Income Calculator (Total Monthly Income)**

**Problem**: "Your total monthly income is ₹[Variable not computed]" - Values not displaying

**Cause**: Variable not computed before being displayed, or formula references incorrect data

**Complete Working Example:**

```typescript
// STEP 1: Define questions that collect income data
{
  id: "Q10",
  type: "numeric_input",
  text: "What is your monthly salary (₹)?",
  validation: {
    required: true,
    inputType: "number",
    min: 0,
    max: 10000000
  }
},
{
  id: "Q11",
  type: "numeric_input",
  text: "What is your monthly rental income (₹)?",
  validation: {
    required: true,
    inputType: "number",
    min: 0,
    max: 10000000
  }
},
{
  id: "Q12",
  type: "numeric_input",
  text: "What is your other monthly income (₹)?",
  validation: {
    required: true,
    inputType: "number",
    min: 0,
    max: 10000000
  }
},

// STEP 2: Define hidden variable AFTER all income questions
{
  hiddenVariables: [
    {
      id: "var_total_income",
      name: "Total Monthly Income",
      type: "computed",
      formula: "Q10 + Q11 + Q12",  // Reference question IDs directly
      computeOn: "Q12",  // Compute AFTER last income question is answered
      dataType: "number"
    }
  ]
}

// STEP 3: Use computed variable in a LATER question (MUST come after Q12)
{
  id: "Q15",  // Note: Comes AFTER Q12
  type: "single_choice",
  text: "Your total monthly income is ₹[INSERT VARIABLE.var_total_income]. Is this correct?",
  options: [
    { id: "1", label: "Yes, that's correct" },
    { id: "2", label: "No, I need to make changes" }
  ]
}
```

**Runtime Implementation (CRITICAL):**

```typescript
// When respondent answers Q12 (trigger question)
function handleAnswerSubmit(questionId: string, answer: any) {
  // Save answer
  responses[questionId] = answer;

  // Check if this question triggers any computed variables
  if (questionId === "Q12") {  // computeOn trigger
    // Compute the variable NOW
    const q10Value = parseFloat(responses["Q10"]) || 0;
    const q11Value = parseFloat(responses["Q11"]) || 0;
    const q12Value = parseFloat(responses["Q12"]) || 0;

    hiddenVariables["var_total_income"] = q10Value + q11Value + q12Value;

    console.log("Computed var_total_income:", hiddenVariables["var_total_income"]);
  }

  // Continue to next question
}

// When displaying Q15 with piping
function applyPiping(text: string) {
  // Replace [INSERT VARIABLE.var_total_income]
  const regex = /\[INSERT VARIABLE\.(\w+)\]/gi;

  return text.replace(regex, (match, varName) => {
    const value = hiddenVariables[varName];

    if (value === undefined || value === null) {
      return "[Variable not computed]";  // ❌ THIS IS YOUR ERROR
    }

    // Format the value
    if (typeof value === 'number') {
      return value.toLocaleString('en-IN');  // Format as Indian currency
    }

    return String(value);
  });
}
```

**Common Errors & Fixes:**

**Error 1: "Variable not computed"**
```typescript
// ❌ WRONG: Variable used BEFORE computed
{
  id: "Q8",
  text: "Your total is ₹[INSERT VARIABLE.var_total_income]"  // var computed at Q12!
}

// ✅ CORRECT: Variable used AFTER computed
{
  id: "Q15",  // Comes after Q12 where var is computed
  text: "Your total is ₹[INSERT VARIABLE.var_total_income]"
}
```

**Error 2: Formula references wrong data structure**
```typescript
// ❌ WRONG: Trying to sum from single-choice question
{
  id: "Q10",
  type: "single_choice",  // Returns option ID, not number
  options: [
    { id: "1", label: "Less than ₹20,000" }  // No numeric value!
  ]
}
formula: "SUM(Q10, Q11, Q12)"  // Won't work!

// ✅ CORRECT: Use numeric input questions
{
  id: "Q10",
  type: "numeric_input"  // Returns actual number
}
formula: "Q10 + Q11 + Q12"  // Works!
```

**Error 3: Missing computeOn trigger**
```typescript
// ❌ WRONG: No trigger specified
{
  id: "var_total",
  type: "computed",
  formula: "Q10 + Q11"
  // Missing: computeOn: "Q11"
}

// ✅ CORRECT: Trigger specified
{
  id: "var_total",
  type: "computed",
  formula: "Q10 + Q11",
  computeOn: "Q11"  // Compute when Q11 is answered
}
```

---

**PATTERN 2: Multi-Select Price Calculator**

```typescript
// Question with prices attached to options
{
  id: "Q20",
  type: "multiple_choice",
  text: "Which services would you like? (Select all that apply)",
  options: [
    { id: "1", label: "Basic Support (₹500/month)", price: 500 },
    { id: "2", label: "Premium Support (₹1,200/month)", price: 1200 },
    { id: "3", label: "Data Backup (₹300/month)", price: 300 },
    { id: "4", label: "Analytics (₹800/month)", price: 800 }
  ],
  validation: {
    required: true,
    minSelections: 1
  }
}

// Hidden variable to calculate total
{
  hiddenVariables: [
    {
      id: "var_service_total",
      name: "Total Service Cost",
      type: "computed",
      formula: "SUM_SELECTED_PRICES(Q20)",  // Special function
      computeOn: "Q20",
      dataType: "number"
    }
  ]
}

// Display the calculated total
{
  id: "Q21",
  type: "single_choice",
  text: "Your monthly total will be ₹[INSERT VARIABLE.var_service_total]. Would you like to proceed?",
  options: [
    { id: "1", label: "Yes, proceed" },
    { id: "2", label: "No, modify selections" }
  ]
}
```

**Runtime Implementation:**
```typescript
function computeSumSelectedPrices(questionId: string) {
  const selectedOptions = responses[questionId];  // Array like ["1", "3"]
  const question = getQuestionById(questionId);

  if (!Array.isArray(selectedOptions)) return 0;

  let total = 0;
  selectedOptions.forEach(optionId => {
    const option = question.options.find(opt => opt.id === optionId);
    if (option && option.price) {
      total += option.price;
    }
  });

  return total;
}

// When Q20 is answered
if (questionId === "Q20") {
  hiddenVariables["var_service_total"] = computeSumSelectedPrices("Q20");
}
```

---

**PATTERN 3: Conditional Calculation with Discount**

```typescript
{
  hiddenVariables: [
    // Base total
    {
      id: "var_base_total",
      type: "computed",
      formula: "SUM_SELECTED_PRICES(Q20)",
      computeOn: "Q20"
    },
    // Discount (10% if total > ₹2000)
    {
      id: "var_discount",
      type: "computed",
      formula: "IF(var_base_total > 2000, var_base_total * 0.10, 0)",
      computeOn: "Q20",  // Same trigger, computed after base_total
      dependsOn: ["var_base_total"]  // Explicit dependency
    },
    // Final total after discount
    {
      id: "var_final_total",
      type: "computed",
      formula: "var_base_total - var_discount",
      computeOn: "Q20",
      dependsOn: ["var_base_total", "var_discount"]
    }
  ]
}

// Display all values
{
  id: "Q25",
  type: "text_area",
  text: `
    Service Total: ₹[INSERT VARIABLE.var_base_total]
    Discount (10% for orders > ₹2000): -₹[INSERT VARIABLE.var_discount]
    ─────────────────────────────
    Final Total: ₹[INSERT VARIABLE.var_final_total]

    Does this look correct?
  `
}
```

**Runtime Implementation:**
```typescript
// Compute in dependency order
function computeTriggeredVariables(questionId: string) {
  const triggered = hiddenVariables.filter(v => v.computeOn === questionId);

  // Sort by dependencies (variables with no deps first)
  const sorted = topologicalSort(triggered);

  sorted.forEach(variable => {
    hiddenVariables[variable.id] = evaluateFormula(
      variable.formula,
      responses,
      hiddenVariables  // Already computed variables available
    );
  });
}
```

---

**PATTERN 4: Eligibility Check Based on Multiple Conditions**

```typescript
{
  hiddenVariables: [
    {
      id: "var_is_eligible",
      name: "Loan Eligibility",
      type: "derived",
      rules: [
        {
          condition: "Q1 >= 18 AND Q2 >= 300000 AND Q3 = '1'",  // Age, income, employment
          value: "eligible",
          message: "Congratulations! You are eligible for a loan."
        },
        {
          condition: "Q1 < 18",
          value: "not_eligible_age",
          message: "Sorry, you must be 18 or older."
        },
        {
          condition: "Q2 < 300000",
          value: "not_eligible_income",
          message: "Sorry, minimum income requirement is ₹3,00,000/year."
        },
        {
          condition: "true",  // Default
          value: "not_eligible_other",
          message: "Sorry, you do not meet the eligibility criteria."
        }
      ],
      computeOn: "Q3",  // Compute after all required questions answered
      dataType: "string"
    }
  ]
}

// Show result
{
  id: "Q10",
  type: "text_display",  // Read-only display
  text: "[INSERT VARIABLE.var_is_eligible_message]",
  showCondition: "VARIABLE.var_is_eligible = 'eligible'"
}
```

**Runtime Implementation:**
```typescript
function evaluateDerivedVariable(variable: DerivedVariable) {
  for (const rule of variable.rules) {
    if (evaluateCondition(rule.condition, responses, hiddenVariables)) {
      return {
        value: rule.value,
        message: rule.message
      };
    }
  }

  // Should never reach here if rules include "true" default
  return { value: "unknown", message: "" };
}
```

---

**PATTERN 5: Dynamic Tax Calculation**

```typescript
{
  hiddenVariables: [
    {
      id: "var_income_category",
      type: "derived",
      rules: [
        { condition: "Q10 <= 250000", value: "no_tax" },
        { condition: "Q10 > 250000 AND Q10 <= 500000", value: "5_percent" },
        { condition: "Q10 > 500000 AND Q10 <= 1000000", value: "20_percent" },
        { condition: "Q10 > 1000000", value: "30_percent" }
      ],
      computeOn: "Q10"
    },
    {
      id: "var_tax_amount",
      type: "computed",
      formula: `
        CASE(var_income_category,
          'no_tax', 0,
          '5_percent', (Q10 - 250000) * 0.05,
          '20_percent', (250000 * 0.05) + ((Q10 - 500000) * 0.20),
          '30_percent', (250000 * 0.05) + (500000 * 0.20) + ((Q10 - 1000000) * 0.30),
          0
        )
      `,
      computeOn: "Q10",
      dependsOn: ["var_income_category"]
    }
  ]
}
```

---

**DEBUGGING CHECKLIST:**

When variables show "[Variable not computed]":

1. **Check computation order:**
   - [ ] Is the variable used AFTER its `computeOn` question?
   - [ ] Are dependent variables computed in the right order?

2. **Check formula syntax:**
   - [ ] Are question IDs correct (Q10, not q10)?
   - [ ] Are variable names correct (var_total, not varTotal)?
   - [ ] Are operators correct (+, not add)?

3. **Check data types:**
   - [ ] Numeric formulas use numeric_input questions (not single_choice)?
   - [ ] String comparisons use quotes ('Yes', not Yes)?

4. **Check runtime:**
   - [ ] Is computation function called when trigger question answered?
   - [ ] Are values stored in hiddenVariables object?
   - [ ] Is piping function reading from hiddenVariables?
   - [ ] Add console.log to verify computation happens

5. **Check display:**
   - [ ] Is piping pattern correct ([INSERT VARIABLE.var_name])?
   - [ ] Is variable name spelled exactly as defined?
   - [ ] Does applyPiping function handle VARIABLE patterns?

**Debug Code Snippet:**
```typescript
// Add this to your computation function
function computeVariable(variableId: string) {
  console.log("Computing variable:", variableId);
  console.log("Current responses:", responses);
  console.log("Current hidden variables:", hiddenVariables);

  const result = evaluateFormula(variable.formula, responses, hiddenVariables);
  console.log("Computed value:", result);

  hiddenVariables[variableId] = result;
}
```

---

## 7. Validation Logic

### 7.1 Required Validation

**Display**: In Notes section

**Format**: `Validation: Required`

**Example**:
```
Notes:
• Validation: Required
```

**Behavior**:
- Must answer before proceeding
- Show error if attempted to skip
- Highlight question/field

---

### 7.2 Range Validation

**Display**: In Notes section

**Format**: `Validation: Range [min-max]`

**Example**:
```
Notes:
• Validation: Range 0-100
• Validation: Min 1, Max 5 selections
```

**Behavior**:
- Enforce numeric range
- Enforce selection count range
- Show error if out of range

---

### 7.3 Format Validation

**Display**: In Notes section

**Format**: `Validation: [Format type]`

**Example**:
```
Notes:
• Validation: Email format
• Validation: Phone number
• Validation: URL
```

**Behavior**:
- Check format on blur or submit
- Show inline error message
- Prevent submission if invalid

---

### 7.4 Custom Validation

**Display**: In Notes section

**Format**: `Validation: [Custom rule]`

**Example**:
```
Notes:
• Validation: Must select at least 3 brands
• Validation: Total must equal 100%
• Validation: Cannot select both "Yes" and "No"
```

---

## 8. Quota Logic

### 8.1 Quota Display

**Display**: In Audience section (header)

**Format**:
```
Audience
Sample Size (N) = 500
Quotas:
  • Quota 1 Split
  • Quota 2 Split
```

**Example**:
```
Audience
Sample Size (N) = 500
Quotas:
  • Age 18-34: 50%
  • Age 35-54: 30%
  • Age 55+: 20%
  • Gender: 50% Male, 50% Female
```

---

### 8.2 Quota Full Termination

**Behavior**:
- Check quota status after screener questions
- If quota full, route to TERM screen
- Display quota full message

**Example**:
```
[IF quota_full(age_18_34) → TERM2]
```

---

## 9. Logic Evaluation Order

### Priority Order:
1. **Hidden Variables** - Initialize and compute before other logic
2. **Show/Hide Conditions** - Evaluate first to determine visibility
3. **Validation** - Check if answer is valid
4. **Piping** - Replace placeholders before displaying questions
5. **Conditional Navigation** - Evaluate in order defined
6. **Default Navigation** - Use if no conditions match

### Evaluation Timing:
- **On Survey Start**: URL parameters, random assignment, initial timestamps
- **On Page Load**: Show/hide conditions, piping, hidden variable display
- **On Answer Change**: Show/hide conditions, computed variables, piping updates
- **On Next Click**: Validation, compute variables (if triggered), navigation logic
- **On Survey Complete**: Final timestamps, duration calculations, quality scores

### Computation Triggers:
- **Immediate**: URL params, embedded data, random assignments
- **Question-based**: Computed variables with `computeOn` property
- **Event-based**: Timestamps on specific events (start, complete, terminate)
- **Conditional**: Derived variables when dependencies are met

---

## 10. Logic Display Guidelines

### 10.1 Badge Placement
- **Always** in metadata row below question options
- **Order**: Default → Conditional → Randomization → Show Condition → Dynamic Options
- **Spacing**: 8px gap between badges
- **Wrapping**: Allow wrapping to multiple lines if needed

### 10.2 Badge Content
- **Concise**: Keep text brief
- **Clear**: Use plain language
- **Consistent**: Use same format for same logic type
- **Complete**: Include all relevant information

### 10.3 Complex Logic
If logic is too complex for badge:
- Use Notes section for detailed explanation
- Keep badge simple, add details in notes

**Example**:
```
[IF complex_condition → Q10]

Notes:
• Logic: If respondent selected "Apple" in Q5 AND rated satisfaction > 7 in Q6
  AND is aged 18-34, skip to Q10. Otherwise continue to Q7.
```

---

## 11. Logic Conflict Detection

### Common Conflicts:

**Unreachable Questions**:
- Question can never be reached due to logic
- Flag in authoring interface

**Logic Loops**:
- Question A routes to B, B routes to A
- Prevent infinite loops

**Missing Targets**:
- Logic references non-existent question
- Show error in authoring

**Contradictory Show/Hide**:
- Multiple conflicting show conditions
- Evaluate in order, first match wins

**Circular Dependencies (Hidden Variables)**:
- Variable A depends on Variable B, which depends on Variable A
- Detect and prevent during schema validation

**Missing Computation Triggers**:
- Computed variable references question that doesn't exist
- Show error during generation

---

## 12. Logic Implementation Patterns

### 12.1 Simple Skip Logic
```json
{
  "questionId": "Q1",
  "questionText": "Do you own a smartphone?",
  "type": "single_choice",
  "options": [
    { "value": 1, "label": "Yes" },
    { "value": 2, "label": "No" }
  ],
  "logic": {
    "conditionalNavigation": [
      {
        "condition": "response = 2",
        "target": "Q10"
      }
    ],
    "defaultTarget": "Q2"
  }
}
```

### 12.2 Multiple Conditions
```json
{
  "logic": {
    "conditionalNavigation": [
      {
        "condition": "response in [1, 6, 7]",
        "target": "TERM1"
      },
      {
        "condition": "response in [2, 3]",
        "target": "Q5"
      },
      {
        "condition": "response in [4, 5]",
        "target": "Q8"
      }
    ],
    "defaultTarget": "Q2"
  }
}
```

### 12.3 Show Condition
```json
{
  "questionId": "Q5",
  "showCondition": {
    "operator": "AND",
    "conditions": [
      {
        "operator": "=",
        "left": "Q1",
        "right": 1
      },
      {
        "operator": ">",
        "left": "Q3",
        "right": 5
      }
    ]
  }
}
```

### 12.4 Randomization
```json
{
  "questionId": "Q10",
  "type": "single_choice",
  "options": [...],
  "randomization": {
    "enabled": true,
    "type": "options",
    "anchored": [6, 99]
  }
}
```

### 12.5 Dynamic Options
```json
{
  "questionId": "Q15",
  "type": "single_choice",
  "dynamicOptions": {
    "sourceQuestionId": "Q10",
    "type": "selected",
    "filter": "exclude_none"
  }
}
```

### 12.6 Piping
```typescript
{
  id: 'Q20',
  type: 'text',
  text: 'You mentioned [INSERT Q1]. Can you elaborate?',
  // Piping is automatic - no separate configuration needed
}

// Or with label piping:
{
  id: 'Q21',
  type: 'text',
  text: 'You selected [INSERT Q1 LABEL]. Can you tell us more about this choice?',
}

// Multiple patterns supported:
{
  id: 'Q22',
  type: 'single_choice',
  text: 'Based on your selection of [INSERT Q4 LABEL], would you pay $[INSERT Q4.SUM]/month?',
  // Mix of LABEL piping and custom SUM piping
}
```

### 12.7 Hidden Variables with Piping
```typescript
{
  // Define hidden variables
  hiddenVariables: [
    {
      id: "var_campaign",
      type: "url_param",
      source: "utm_campaign",
      defaultValue: "direct"
    },
    {
      id: "var_total_price",
      type: "computed",
      formula: "SUM(Q10.selected_prices)",
      computeOn: "Q10"
    },
    {
      id: "var_discount",
      type: "computed",
      formula: "IF(var_total_price > 100, var_total_price * 0.10, 0)",
      computeOn: "Q10"
    }
  ],

  // Use in questions
  questions: [
    {
      id: 'Q15',
      type: 'text_area',
      text: "Based on your selections, your total is $[INSERT VARIABLE.var_total_price]. With your discount of $[INSERT VARIABLE.var_discount], your final price is $[INSERT VARIABLE.var_final_price]. Does this work for your budget?",
    },
    {
      id: 'Q16',
      type: 'single_choice',
      text: "Premium features available",
      showCondition: "VARIABLE.var_total_price > 200",
      options: [...]
    }
  ]
}
```

### 12.8 Loop Piping with Dynamic Options
```typescript
{
  id: 'Q20',
  type: 'multiple_choice',
  text: "Which brands have you used?",
  options: [
    { id: "1", label: "Apple" },
    { id: "2", label: "Samsung" },
    { id: "3", label: "Google" },
    { id: "4", label: "OnePlus" }
  ]
},
{
  id: 'Q21',
  type: 'rating_scale',
  text: "Rate your satisfaction with [LOOP ITEM]",
  loopSource: "Q20",  // Creates Q21a, Q21b, Q21c, etc.
  scaleMin: 1,
  scaleMax: 5
},
{
  id: 'Q22',
  type: 'single_choice',
  text: "Which of the brands you've used is your primary device?",
  dynamicOptions: "Q20",  // Only show brands selected in Q20
}
```

---

## 13. Testing Logic

### Test Cases:

**Navigation Logic**:
- [ ] Test all conditional paths
- [ ] Verify default navigation
- [ ] Confirm termination logic
- [ ] Check skip logic

**Display Logic**:
- [ ] Test show conditions
- [ ] Test hide conditions
- [ ] Verify dynamic updates
- [ ] Check nested conditions

**Randomization**:
- [ ] Verify randomization works
- [ ] Confirm anchored items stay fixed
- [ ] Test consistency within session

**Dynamic Options**:
- [ ] Test with various selections
- [ ] Test with no selections
- [ ] Verify option labels

**Piping**:
- [ ] Test raw value piping with text answers
- [ ] Test label piping with choice questions
- [ ] Test count/aggregate piping (.COUNT, .SUM)
- [ ] Test piping with empty/skipped answers
- [ ] Test piping in question text, options, and placeholders
- [ ] Verify [No response] displays for unanswered questions
- [ ] Test multiple piping patterns in single question
- [ ] Test piping with special characters in answers

**Loop Piping**:
- [ ] Test loop with different selection counts (1, 3, max)
- [ ] Verify correct number of question instances created
- [ ] Test loop with no selections (should skip)
- [ ] Verify loop responses stored correctly
- [ ] Test piping loop results in later questions

**Hidden Variables**:
- [ ] Test URL parameter capture
- [ ] Test computed variables after trigger questions
- [ ] Test formula calculations (SUM, AVG, IF, etc.)
- [ ] Test derived variables with conditional rules
- [ ] Test random assignment distribution
- [ ] Test timestamp capture
- [ ] Test variable piping in questions
- [ ] Test variables in show/hide conditions
- [ ] Test variables in navigation logic
- [ ] Verify variables stored separately from responses
- [ ] Test circular dependency detection
- [ ] Test missing trigger question handling

**Validation**:
- [ ] Test required fields
- [ ] Test range validation
- [ ] Test format validation
- [ ] Test custom rules

---

## Related Documentation

- **Theme Details**: See `survey-ui-theme.md`
- **Structure Specifications**: See `survey-structure-spec.md`
- **Component Specifications**: See `survey-components-spec.md`
- **Question Types**: See `survey-question-types.md`

