# Survey Question Types Specification

This document defines all supported question types and their exact specifications for consistent survey generation.

**Reference**: Works with `survey-ui-theme.md`, `survey-structure-spec.md`, and `survey-components-spec.md`

---

## 🚨 CRITICAL: All Questions Are Mandatory

**RULE**: Every question in the survey sequence MUST be answered. Respondents cannot skip any question.

### Implementation

All questions (except Informational screens) must have:

```typescript
validation: {
  required: true  // MANDATORY for all questions
}
```

### Question Types Affected

- ✅ **Single Choice**: Must select one option
- ✅ **Multiple Choice**: Must select at least `minSelections` (typically 1)
- ✅ **Text Input**: Must enter text (non-whitespace)
- ✅ **Text Area**: Must enter text (non-whitespace)
- ✅ **Number Input**: Must enter a number
- ✅ **Dropdown**: Must select an option from dropdown
- ✅ **Matrix**: Must answer **all rows** (`requireAllRows: true`)
- ✅ **Rating Scale**: Must select a rating
- ✅ **Ranking**: Must rank required items
- ✅ **Date/Time**: Must select a date/time

### Exceptions

**ONLY** these question types are not required (no user input):
- ❌ Introduction Screen
- ❌ Termination Screen
- ❌ Thank You Screen

### Why Mandatory?

1. **Data Quality**: Ensures complete responses for analysis
2. **Sample Integrity**: Prevents partial/incomplete data
3. **Statistical Validity**: All respondents answer same questions
4. **Professional Standard**: Industry best practice for surveys

### Validation Messages

When user tries to proceed without answering:
- Single/Multiple Choice: "Please select an option"
- Text Input: "This field is required"
- Matrix: "Please answer all rows before continuing"
- Number: "Please enter a number"
- Dropdown: "Please select an option"

### Generation Checklist

When generating survey schema:
- [ ] Verify ALL questions have `validation: { required: true }`
- [ ] Exception: Informational screens only (INTRO, TERM, THANK)
- [ ] Matrix questions: Include `requireAllRows: true`
- [ ] Multiple choice: Include `minSelections: 1` (or higher if specified)
- [ ] Text inputs: Include `rejectWhitespaceOnly: true`

---

## 🚨 CRITICAL: Question Type Identification

**COMMON ERROR**: Generating rating questions as multiple choice type. This is a CRITICAL mistake that must be avoided.

### Before Generating ANY Question

Follow this verification process:

1. **Read the question text completely**
2. **Look for type indicators** (keywords, format clues)
3. **Check the response format** (scale, options, text)
4. **Select the correct type** based on evidence
5. **Double-check** before generating

### Decision Logic

Use this decision tree for EVERY question:

```
Does it have a numerical scale (1-5, 1-7, 0-10)?
├─ YES: Is it 0-10 or 0-100?
│   ├─ YES → Use "slider" type (NPS questions)
│   └─ NO → Use "ratingScale" type (satisfaction, agreement scales)
│
└─ NO: Continue...
    │
    ├─ Does it say "Select all that apply" or show checkboxes?
    │   └─ YES → Use "multipleChoice" type
    │
    ├─ Is it a grid with multiple items rated on same scale?
    │   └─ YES → Use "matrix" type
    │
    ├─ Does it ask for text/explanation?
    │   ├─ Short answer → Use "text" type
    │   └─ Long answer → Use "textArea" type
    │
    ├─ Does it have many options (10+)?
    │   └─ YES → Use "dropdown" type
    │
    └─ Default → Use "singleChoice" type
```

### Type Indicators Reference

#### Rating Scale Indicators
**Use type: `ratingScale`**

Keywords to look for:
- "Rate", "Rating", "Scale"
- "How satisfied", "How likely", "How much"
- "1 to 5", "1 to 10", "1-7 scale"
- "Strongly disagree to strongly agree"
- "Not at all to extremely"
- "Poor to excellent"

Format clues:
- Numbered options (1, 2, 3, 4, 5)
- Labeled endpoints only
- Spectrum from negative to positive
- Agreement scales (Likert)

#### Slider/NPS Indicators
**Use type: `slider`**

Keywords:
- "0 to 10 scale"
- "Likelihood to recommend"
- "NPS", "Net Promoter Score"

Format clues:
- 0-10 or 0-100 range
- Continuous scale
- Endpoints labeled

#### Multiple Choice Indicators
**Use type: `multipleChoice`**

Keywords:
- "Select all that apply"
- "Choose all"
- "Check all"
- "Multiple selections"

Format clues:
- Checkbox symbols (☐)
- Explicit "select all" instruction

#### Single Choice Indicators
**Use type: `singleChoice`**

Keywords:
- "Select one"
- "Choose one"
- "Pick one"
- "Which one"

Format clues:
- Radio button symbols (○)
- Mutually exclusive options
- No scale implied

#### Matrix Indicators
**Use type: `matrix`**

Keywords:
- Multiple items with same scale
- "For each item, rate..."
- Grid, table format

Format clues:
- Rows: Multiple items
- Columns: Scale or options
- Grid structure

### Common Mistakes & Corrections

#### ❌ MISTAKE 1: Rating as Multiple Choice

**WRONG CODE:**
```typescript
{
  id: "Q5",
  type: "multipleChoice", // ❌ WRONG!
  text: "How satisfied are you with our service?",
  options: [
    { value: "1", label: "Very dissatisfied" },
    { value: "2", label: "Dissatisfied" },
    { value: "3", label: "Neutral" },
    { value: "4", label: "Satisfied" },
    { value: "5", label: "Very satisfied" }
  ],
  validation: { required: true, minSelections: 1 }
}
```

**Why it's wrong:**
- Question asks "How satisfied" → indicates rating
- Options are numbered 1-5 → rating scale
- Options form a spectrum → rating scale
- Should NOT be multipleChoice

**CORRECT CODE:**
```typescript
{
  id: "Q5",
  type: "ratingScale", // ✅ CORRECT!
  text: "How satisfied are you with our service?",
  scale: {
    min: 1,
    max: 5,
    minLabel: "Very dissatisfied",
    maxLabel: "Very satisfied",
    labels: {
      "1": "Very dissatisfied",
      "2": "Dissatisfied",
      "3": "Neutral",
      "4": "Satisfied",
      "5": "Very satisfied"
    }
  },
  validation: { required: true }
}
```

#### ❌ MISTAKE 2: Single Choice as Multiple Choice

**WRONG CODE:**
```typescript
{
  id: "Q1",
  type: "multipleChoice", // ❌ WRONG!
  text: "What is your gender?",
  options: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" }
  ],
  validation: { required: true, minSelections: 1 }
}
```

**Why it's wrong:**
- Only one answer expected
- No "select all" instruction
- Mutually exclusive options

**CORRECT CODE:**
```typescript
{
  id: "Q1",
  type: "singleChoice", // ✅ CORRECT!
  text: "What is your gender?",
  options: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" }
  ],
  validation: { required: true }
}
```

#### ❌ MISTAKE 3: NPS as Rating Scale

**WRONG CODE:**
```typescript
{
  id: "Q10",
  type: "ratingScale", // ❌ WRONG for 0-10!
  text: "How likely are you to recommend us to a friend?",
  scale: {
    min: 0,
    max: 10
  },
  validation: { required: true }
}
```

**Why it's wrong:**
- 0-10 scale should use slider
- NPS questions use slider type

**CORRECT CODE:**
```typescript
{
  id: "Q10",
  type: "slider", // ✅ CORRECT!
  text: "How likely are you to recommend us to a friend?",
  min: 0,
  max: 10,
  minLabel: "Not at all likely",
  maxLabel: "Extremely likely",
  validation: { required: true }
}
```

#### ✅ CORRECT: Agreement Scale

**CORRECT CODE:**
```typescript
{
  id: "Q8",
  type: "ratingScale", // ✅ CORRECT!
  text: "I am satisfied with the customer service.",
  scale: {
    min: 1,
    max: 5,
    minLabel: "Strongly disagree",
    maxLabel: "Strongly agree",
    labels: {
      "1": "Strongly disagree",
      "2": "Disagree",
      "3": "Neither agree nor disagree",
      "4": "Agree",
      "5": "Strongly agree"
    }
  },
  validation: { required: true }
}
```

**Why it's correct:**
- Likert scale format
- Agreement spectrum
- 1-5 rating scale
- Uses ratingScale type

### Verification Checklist

Before generating each question, verify:

- [ ] I have read the question text completely
- [ ] I identified keywords (rate, scale, select all, choose one)
- [ ] I checked for numerical scales (1-5, 0-10)
- [ ] I verified if single or multiple selection
- [ ] I confirmed the type matches the response format
- [ ] I am NOT defaulting to multipleChoice without evidence
- [ ] If it's a rating/satisfaction question, I'm using ratingScale
- [ ] If it's 0-10 NPS, I'm using slider
- [ ] If it says "select all", I'm using multipleChoice
- [ ] If it's single selection, I'm using singleChoice

### Quick Reference: Type Selection

| Question Pattern | Correct Type | Wrong Type |
|-----------------|--------------|------------|
| "Rate 1-5" | `ratingScale` | ❌ multipleChoice |
| "How satisfied (1-5)" | `ratingScale` | ❌ multipleChoice |
| "Strongly disagree to agree" | `ratingScale` | ❌ singleChoice |
| "Rate 0-10" | `slider` | ❌ ratingScale |
| "NPS / Recommend (0-10)" | `slider` | ❌ ratingScale |
| "Select all that apply" | `multipleChoice` | ❌ singleChoice |
| "Choose one" | `singleChoice` | ❌ multipleChoice |
| "What is your age/gender" | `singleChoice` | ❌ multipleChoice |
| Grid: Multiple items rated | `matrix` | ❌ Multiple ratingScale |
| "Please describe" | `textArea` | ❌ text |
| Long dropdown list | `dropdown` | ❌ singleChoice |

### Red Flags for Rating Scale

If you see ANY of these, use `ratingScale` NOT `multipleChoice`:

⚠️ Numbers as option values (1, 2, 3, 4, 5)
⚠️ Words like "satisfied", "likely", "agree", "important"
⚠️ Spectrum from negative to positive
⚠️ Labeled endpoints (e.g., "Poor" to "Excellent")
⚠️ Question contains "rate" or "rating"
⚠️ Question contains "how much", "how satisfied", "how likely"

### Summary

**Golden Rule**: Match the question type to the RESPONSE FORMAT, not just the options.

- **Has numerical scale (1-5, 1-7)** → `ratingScale`
- **Has 0-10 scale (NPS)** → `slider`
- **Says "select all"** → `multipleChoice`
- **Single selection, no scale** → `singleChoice`
- **Grid of multiple items** → `matrix`
- **Asks for text** → `text` or `textArea`
- **Long list of options** → `dropdown`

**Always verify type before generating. Type errors are critical mistakes.**

---

## 🚨 CRITICAL: Validation Based on Expected Answer Type

**RULE**: Apply appropriate validation based on the data type expected in the answer.

### Why Validations Matter

1. **Data Quality**: Ensures responses are in the correct format
2. **User Experience**: Provides immediate feedback on invalid inputs
3. **Data Analysis**: Makes responses analyzable and consistent
4. **Error Prevention**: Catches mistakes before submission

### Validation Decision Process

**For EVERY text input question, ask:**
1. What type of data is expected? (number, email, text, date, phone, etc.)
2. What validation rules apply to this data type?
3. Are there length/range constraints?
4. Are there format requirements?

### Validation Types by Expected Answer

#### 1. Numeric Text Inputs

**When to use**: Question expects a NUMBER in a text field

**Examples of questions:**
- "What is your age?"
- "How many people in your household?"
- "What year were you born?"
- "How many hours per week?"
- "What is your annual income?"
- "Enter quantity"

**CORRECT Implementation:**
```typescript
{
  id: "Q1",
  type: "text",
  text: "What is your age?",
  validation: {
    required: true,
    inputType: "number",  // ✅ Ensures numeric input
    min: 18,              // ✅ Minimum value
    max: 120,             // ✅ Maximum value
    errorMessage: "Please enter a valid age between 18 and 120"
  }
}
```

**Pattern for numeric validation:**
- `inputType: "number"` - Only accepts numeric input
- `min` / `max` - Range constraints
- `pattern: "^[0-9]+$"` - Alternative: Regex for numbers only

#### 2. Email Inputs

**When to use**: Question asks for email address

**Examples:**
- "What is your email address?"
- "Please provide your work email"
- "Enter contact email"

**CORRECT Implementation:**
```typescript
{
  id: "Q2",
  type: "text",
  text: "What is your email address?",
  validation: {
    required: true,
    inputType: "email",  // ✅ Email validation
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    errorMessage: "Please enter a valid email address"
  }
}
```

#### 3. Phone Number Inputs

**When to use**: Question asks for phone number

**Examples:**
- "What is your phone number?"
- "Enter mobile number"
- "Contact phone"

**CORRECT Implementation:**
```typescript
{
  id: "Q3",
  type: "text",
  text: "What is your phone number?",
  validation: {
    required: true,
    inputType: "tel",  // ✅ Phone input type
    pattern: "^[0-9]{10}$",  // For 10-digit numbers
    // OR: "^\\+?[1-9]\\d{1,14}$" for international
    minLength: 10,
    maxLength: 15,
    errorMessage: "Please enter a valid phone number (10 digits)"
  }
}
```

#### 4. URL Inputs

**When to use**: Question asks for website URL

**Examples:**
- "What is your company website?"
- "Enter LinkedIn profile URL"
- "Provide website link"

**CORRECT Implementation:**
```typescript
{
  id: "Q4",
  type: "text",
  text: "What is your company website?",
  validation: {
    required: true,
    inputType: "url",  // ✅ URL validation
    pattern: "^https?://[^\\s]+$",
    errorMessage: "Please enter a valid URL (e.g., https://example.com)"
  }
}
```

#### 5. Text-Only Inputs (Names, Text)

**When to use**: Question expects text, no numbers or special characters

**Examples:**
- "What is your first name?"
- "Enter city name"
- "What is your job title?"

**CORRECT Implementation:**
```typescript
{
  id: "Q5",
  type: "text",
  text: "What is your first name?",
  validation: {
    required: true,
    inputType: "text",
    pattern: "^[a-zA-Z\\s]+$",  // ✅ Letters and spaces only
    minLength: 2,
    maxLength: 50,
    errorMessage: "Please enter a valid name (letters only)"
  }
}
```

#### 6. Alphanumeric Inputs

**When to use**: Question expects letters and numbers (IDs, codes)

**Examples:**
- "Enter your employee ID"
- "What is your postal code?"
- "Enter product code"

**CORRECT Implementation:**
```typescript
{
  id: "Q6",
  type: "text",
  text: "Enter your employee ID",
  validation: {
    required: true,
    pattern: "^[a-zA-Z0-9]+$",  // ✅ Alphanumeric only
    minLength: 5,
    maxLength: 10,
    errorMessage: "Please enter a valid employee ID"
  }
}
```

#### 7. Percentage Inputs

**When to use**: Question expects a percentage value

**Examples:**
- "What percentage of your budget?"
- "Enter completion rate (%)"

**CORRECT Implementation:**
```typescript
{
  id: "Q7",
  type: "text",
  text: "What percentage of your budget is spent on marketing?",
  validation: {
    required: true,
    inputType: "number",
    min: 0,
    max: 100,  // ✅ Percentage range
    errorMessage: "Please enter a value between 0 and 100"
  }
}
```

#### 8. Currency/Money Inputs

**When to use**: Question expects monetary value

**Examples:**
- "What is your monthly budget?"
- "Enter salary"
- "How much did you spend?"

**CORRECT Implementation:**
```typescript
{
  id: "Q8",
  type: "text",
  text: "What is your monthly budget?",
  validation: {
    required: true,
    inputType: "number",
    min: 0,
    pattern: "^[0-9]+(\\.[0-9]{1,2})?$",  // ✅ Allows decimals
    errorMessage: "Please enter a valid amount"
  }
}
```

#### 9. Year Inputs

**When to use**: Question asks for a year

**Examples:**
- "What year did you graduate?"
- "Enter birth year"
- "Year of purchase"

**CORRECT Implementation:**
```typescript
{
  id: "Q9",
  type: "text",
  text: "What year did you graduate?",
  validation: {
    required: true,
    inputType: "number",
    min: 1950,
    max: 2025,  // ✅ Reasonable year range
    pattern: "^[0-9]{4}$",  // Exactly 4 digits
    errorMessage: "Please enter a valid year (e.g., 2020)"
  }
}
```

#### 10. Free Text (No Constraints)

**When to use**: Question expects open-ended text response

**Examples:**
- "Please describe your experience"
- "What are your suggestions?"
- "Any additional comments?"

**CORRECT Implementation:**
```typescript
{
  id: "Q10",
  type: "textArea",
  text: "Please describe your experience with our product",
  validation: {
    required: true,
    minLength: 10,        // ✅ Minimum meaningful response
    maxLength: 500,       // ✅ Reasonable maximum
    rejectWhitespaceOnly: true,
    errorMessage: "Please provide at least 10 characters"
  }
}
```

### Validation Properties Reference

| Property | Type | Purpose | Example |
|----------|------|---------|---------|
| `required` | boolean | Make question mandatory | `true` |
| `inputType` | string | HTML input type | `"number"`, `"email"`, `"tel"`, `"url"` |
| `pattern` | string | Regex pattern for validation | `"^[0-9]+$"` |
| `min` | number | Minimum value (for numbers) | `18` |
| `max` | number | Maximum value (for numbers) | `120` |
| `minLength` | number | Minimum text length | `2` |
| `maxLength` | number | Maximum text length | `100` |
| `rejectWhitespaceOnly` | boolean | Reject only spaces | `true` |
| `errorMessage` | string | Custom error message | `"Please enter a valid age"` |

### Common Validation Patterns

```typescript
// Numbers only
pattern: "^[0-9]+$"

// Decimal numbers (money, percentages)
pattern: "^[0-9]+(\\.[0-9]{1,2})?$"

// Email
pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"

// Phone (10 digits)
pattern: "^[0-9]{10}$"

// Phone (international)
pattern: "^\\+?[1-9]\\d{1,14}$"

// Letters only
pattern: "^[a-zA-Z\\s]+$"

// Alphanumeric only
pattern: "^[a-zA-Z0-9]+$"

// Postal code (US)
pattern: "^[0-9]{5}(-[0-9]{4})?$"

// Year (4 digits)
pattern: "^[0-9]{4}$"

// URL
pattern: "^https?://[^\\s]+$"
```

### Decision Tree for Text Input Validation

```
What does the question ask for?
│
├─ Number (age, quantity, count)
│   └─ Use: inputType: "number", min/max, pattern: "^[0-9]+$"
│
├─ Email address
│   └─ Use: inputType: "email", pattern: <email-regex>
│
├─ Phone number
│   └─ Use: inputType: "tel", pattern: <phone-regex>, minLength, maxLength
│
├─ Website URL
│   └─ Use: inputType: "url", pattern: <url-regex>
│
├─ Name (text only)
│   └─ Use: pattern: "^[a-zA-Z\\s]+$", minLength, maxLength
│
├─ ID/Code (alphanumeric)
│   └─ Use: pattern: "^[a-zA-Z0-9]+$", minLength, maxLength
│
├─ Year
│   └─ Use: inputType: "number", min, max, pattern: "^[0-9]{4}$"
│
├─ Money/Currency
│   └─ Use: inputType: "number", min: 0, pattern: <decimal-regex>
│
├─ Percentage
│   └─ Use: inputType: "number", min: 0, max: 100
│
└─ Free text (description, comments)
    └─ Use: minLength, maxLength, rejectWhitespaceOnly: true
```

### Common Mistakes to Avoid

#### ❌ MISTAKE: No Validation on Numeric Questions

**WRONG:**
```typescript
{
  id: "Q1",
  type: "text",
  text: "What is your age?",
  validation: {
    required: true  // ❌ Missing numeric validation!
  }
}
```

**Problem**: User can type letters, special characters, unrealistic values

**CORRECT:**
```typescript
{
  id: "Q1",
  type: "text",
  text: "What is your age?",
  validation: {
    required: true,
    inputType: "number",  // ✅ Numeric only
    min: 18,
    max: 120,
    errorMessage: "Please enter a valid age"
  }
}
```

#### ❌ MISTAKE: No Email Validation

**WRONG:**
```typescript
{
  id: "Q2",
  type: "text",
  text: "What is your email?",
  validation: {
    required: true  // ❌ Missing email validation!
  }
}
```

**CORRECT:**
```typescript
{
  id: "Q2",
  type: "text",
  text: "What is your email?",
  validation: {
    required: true,
    inputType: "email",  // ✅ Email validation
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    errorMessage: "Please enter a valid email address"
  }
}
```

#### ❌ MISTAKE: No Length Constraints on Text

**WRONG:**
```typescript
{
  id: "Q3",
  type: "textArea",
  text: "Please describe your experience",
  validation: {
    required: true  // ❌ No length constraints!
  }
}
```

**CORRECT:**
```typescript
{
  id: "Q3",
  type: "textArea",
  text: "Please describe your experience",
  validation: {
    required: true,
    minLength: 10,   // ✅ Minimum meaningful response
    maxLength: 500,  // ✅ Reasonable limit
    rejectWhitespaceOnly: true,
    errorMessage: "Please provide at least 10 characters"
  }
}
```

### Generation Checklist

Before generating each text/textArea question, verify:

- [ ] I identified what type of data is expected (number, email, text, etc.)
- [ ] I added appropriate `inputType` if applicable
- [ ] I added `pattern` validation for format requirements
- [ ] I added `min`/`max` for numeric ranges
- [ ] I added `minLength`/`maxLength` for text length
- [ ] I added meaningful `errorMessage`
- [ ] I added `rejectWhitespaceOnly: true` for text inputs
- [ ] Validation rules match the question's expected answer type

### Summary

**Golden Rule**: Match validation to the expected answer format.

**Quick Reference:**
- **Number expected** → Add `inputType: "number"`, `min`, `max`, numeric pattern
- **Email expected** → Add `inputType: "email"`, email pattern
- **Phone expected** → Add `inputType: "tel"`, phone pattern
- **URL expected** → Add `inputType: "url"`, URL pattern
- **Text expected** → Add `minLength`, `maxLength`, appropriate pattern
- **Free text** → Add `minLength`, `maxLength`, `rejectWhitespaceOnly: true`

**Always add validation based on expected answer type. Missing validation leads to poor data quality.**

---

## Question Type Categories

1. **Informational** - Display only, no input
2. **Selection** - Single or multiple choice
3. **Text Entry** - Open-ended responses
4. **Numeric** - Number inputs
5. **Matrix** - Grid-based questions
6. **Ranking** - Order preferences
7. **Scale** - Rating scales

---

## 1. Informational Question Types

### 1.1 Introduction Screen

**Purpose**: Welcome message, consent, instructions

**Type Badge**: "Introduction Screen"

**Question ID Format**: INTRO1, INTRO2, etc.

**Structure**:
- Question ID badge
- Type badge
- Welcome/instruction text (paragraph)
- No input area
- Metadata: Default navigation

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

**Use Cases**:
- Survey introduction
- Consent forms
- Instructions
- Section introductions

---

### 1.2 Termination Screen

**Purpose**: End survey with thank you or disqualification message

**Type Badge**: "Termination Screen"

**Question ID Format**: TERM1, TERM2, etc.

**Structure**:
- Question ID badge
- Type badge
- Termination message
- "Return to Home" button (redirects to `/survey`)

**Example**:
```
[TERM1] [Termination Screen]

Thank you for your interest in this survey. Unfortunately, you do not meet the
qualification criteria for this particular study. We appreciate your time.

[Return to Home] → /survey
```

**Use Cases**:
- Disqualification messages
- Quota full messages
- Survey completion thank you

**Navigation**:
- No "Previous" or "Next" buttons
- "Return to Home" button redirects to `/survey`

---

### 1.3 Thank You Screen

**Purpose**: Survey completion confirmation

**Type Badge**: "Thank You Screen"

**Question ID Format**: THANK1

**Structure**:
- Question ID badge
- Type badge
- Thank you message
- Optional: Incentive information
- No navigation (end of survey)

**Example**:
```
[THANK1] [Thank You Screen]

Thank you for completing this survey! Your responses have been recorded. Your 
feedback is valuable and will help us improve our products and services.
```

---

## 2. Selection Question Types

### 2.1 Single Choice (Radio Buttons)

**Purpose**: Select exactly one option

**Type Badge**: "Single Choice"

**Question ID Format**: SCR1, Q1, BA1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Radio button list (vertical)
- Optional: Metadata badges
- Optional: Notes section

**Options Display**:
```
○ Option 1
○ Option 2
○ Option 3
○ Option 4
```

**Example**:
```
[SCR1] [Single Choice]

What is your age?

○ Under 18
○ 18-24
○ 25-34
○ 35-44
○ 45-55
○ 56-64
○ 65 or older

[Default → SCR2] [IF response = [1, 6, 7] → TERM1]

Notes:
• Validation: Required
```

**Use Cases**:
- Demographics (age, gender, etc.)
- Yes/No questions
- Screener questions
- Single selection from list

**Validation**:
- Required: Must select one option
- Optional: Can skip

**Example with "Other" Option**:
```
[Q2] [Single Choice]

What is your primary mode of transportation?

○ Car
○ Bus
○ Train
○ Bicycle
○ Walk
○ Other (please specify) [text input appears when selected]

[Default → Q3]

Notes:
• Validation: Required
• "Other" option shows text input when selected
• Text input required when "Other" is selected
```

**See**: `other-option-spec.md` for complete "Other" option implementation details

---

### 2.2 Multiple Choice (Checkboxes)

**Purpose**: Select one or more options

**Type Badge**: "Multiple Choice"

**Question ID Format**: Q1, BA1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Checkbox list (vertical)
- Optional: Min/max selection limits
- Optional: Metadata badges
- Optional: Notes section

**Options Display**:
```
☐ Option 1
☐ Option 2
☐ Option 3
☐ Option 4
```

**Example**:
```
[Q5] [Multiple Choice]

Which of the following smartphone brands are you familiar with? (Select all that apply)

☐ Apple
☐ Samsung
☐ Google
☐ OnePlus
☐ Xiaomi
☐ Huawei
☐ None of the above

[Default → Q6]

Notes:
• Validation: Select at least 1
• Exclusive option: "None of the above"
```

**Use Cases**:
- Brand awareness
- Feature preferences
- Multiple selections
- "Select all that apply"

**Validation**:
- Min selections: Minimum number required
- Max selections: Maximum allowed
- Exclusive options: Deselect others when selected

**Example with "Other" Option**:
```
[Q6] [Multiple Choice]

What features are most important to you? (Select all that apply)

☐ Battery life
☐ Camera quality
☐ Screen size
☐ Storage capacity
☐ Processing speed
☐ Other (please specify) [text input appears when checked]

[Default → Q7]

Notes:
• Validation: Select at least 1
• "Other" option shows text input when checked
• Text input required when "Other" is checked
• Can select multiple options including "Other"
```

**See**: `other-option-spec.md` for complete "Other" option implementation details

---

### 2.3 Dropdown (Select)

**Purpose**: Select one option from a dropdown list

**Type Badge**: "Dropdown"

**Question ID Format**: Q1, DEM1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Dropdown select element
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
[Select an option ▼]
```

**Example**:
```
[DEM1] [Dropdown]

What is your highest level of education?

[Select an option ▼]

[Default → DEM2]
```

**Options** (in dropdown):
- High school or less
- Some college
- Bachelor's degree
- Master's degree
- Doctorate or professional degree

**Use Cases**:
- Long lists of options (countries, states, etc.)
- Demographics
- Space-constrained layouts

**Validation**:
- Required: Must select an option
- Optional: Can leave as placeholder

---

## 3. Text Entry Question Types

### 3.1 Short Text

**Purpose**: Brief text response (single line)

**Type Badge**: "Text Input"

**Question ID Format**: Q1, OE1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Single-line text input
- Optional: Character limit
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
[                                                    ]
```

**Example**:
```
[OE1] [Text Input]

What is your favorite smartphone feature?

[                                                    ]

[Default → OE2]

Notes:
• Validation: Required
• Max length: 100 characters
```

**Use Cases**:
- Names
- Short descriptions
- Brief open-ended responses

**Validation**:
- Required/Optional
- Min/max character length (calculated AFTER trimming whitespace)
- Pattern matching (email, phone, etc.)
- **Whitespace handling**:
  - Automatically trim leading/trailing spaces on blur and submit
  - Reject whitespace-only input (spaces, tabs, newlines)
  - Minimum length validated after trimming
  - Error: "Please enter a valid response (not just spaces)"

**Validation Rules (CRITICAL)**:
```typescript
{
  required: true,
  minLength: 1,              // After trimming
  maxLength: 100,            // Before trimming (prevent abuse)
  trimWhitespace: true,      // DEFAULT: Always trim
  rejectWhitespaceOnly: true // DEFAULT: Reject "   " or empty after trim
}
```

**Implementation**:
- Trim on blur (when user leaves field)
- Trim on submit (before validation)
- Show error if whitespace-only and required
- Visual indicator: Clear spaces automatically

**Example with Validation**:
```
[OE3] [Text Input]

What is your email address?

[                                                    ]

[Default → OE4]

Notes:
• Validation: Required
• Pattern: Email format
• Max length: 100 characters
• Trim whitespace: Yes (automatic)
• Reject whitespace-only: Yes (automatic)
```

**Common Validation Scenarios**:

| Scenario | Input | After Trim | Result |
|----------|-------|------------|--------|
| Valid | "john@example.com" | "john@example.com" | ✅ Valid |
| Leading/trailing spaces | "  john@example.com  " | "john@example.com" | ✅ Valid (trimmed) |
| Only spaces | "     " | "" | ❌ Error: "This field is required" |
| Too short (after trim) | "  a  " | "a" | ❌ Error: "Please enter at least 3 characters" |

---

### 3.2 Long Text (Textarea)

**Purpose**: Extended text response (multiple lines)

**Type Badge**: "Text Area"

**Question ID Format**: Q1, OE1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Multi-line textarea
- Optional: Character limit
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Example**:
```
[OE2] [Text Area]

Please describe your experience with your current smartphone in detail.

┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘

[Default → Q10]

Notes:
• Validation: Required
• Min length: 50 characters
• Max length: 500 characters
```

**Use Cases**:
- Detailed feedback
- Comments
- Explanations
- Suggestions

**Validation**:
- Required/Optional
- Min/max character length (calculated AFTER trimming whitespace)
- Word count limits (calculated AFTER trimming)
- **Whitespace handling**:
  - Automatically trim leading/trailing spaces on blur and submit
  - Reject whitespace-only input (spaces, tabs, newlines, line breaks)
  - Minimum length validated after trimming
  - Error: "Please provide meaningful feedback (not just spaces)"

**Validation Rules (CRITICAL)**:
```typescript
{
  required: true,
  minLength: 50,             // After trimming
  maxLength: 500,            // Before trimming (prevent abuse)
  trimWhitespace: true,      // DEFAULT: Always trim
  rejectWhitespaceOnly: true // DEFAULT: Reject "   \n   " or empty after trim
}
```

**Implementation**:
- Trim on blur (when user leaves field)
- Trim on submit (before validation)
- Show error if whitespace-only and required
- Count characters after trimming for min/max validation
- Visual indicator: Clear spaces automatically

**Example with Validation**:
```
[OE5] [Text Area]

Please describe your experience in detail. What did you like or dislike?

┌──────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘

[Default → Q12]

Notes:
• Validation: Required
• Min length: 50 characters (after trim)
• Max length: 500 characters
• Trim whitespace: Yes (automatic)
• Reject whitespace-only: Yes (automatic)
```

**Common Validation Scenarios**:

| Scenario | Input | After Trim | Result |
|----------|-------|------------|--------|
| Valid | "The product was great..." (60 chars) | "The product was great..." | ✅ Valid |
| Spaces padded | "\n\n  Good experience  \n\n" (20 chars) | "Good experience" (15 chars) | ❌ Error: "Please enter at least 50 characters" |
| Only whitespace | "\n   \n   \n   " | "" | ❌ Error: "This field is required" |
| Valid with newlines | "Line 1\n\nLine 2..." (60 chars) | "Line 1\n\nLine 2..." (same) | ✅ Valid (internal whitespace preserved) |

**Note**: Trimming only removes **leading and trailing** whitespace, not internal spaces or newlines.

---

## 4. Numeric Question Types

### 4.1 Number Input

**Purpose**: Numeric value entry

**Type Badge**: "Numeric Input"

**Question ID Format**: Q1, NUM1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Number input field
- Optional: Unit label (e.g., "$", "years", "%")
- Optional: Min/max range
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
[______] years
```

**Example**:
```
[NUM1] [Numeric Input]

How many smartphones have you owned in the past 5 years?

[______] smartphones

[Default → NUM2]

Notes:
• Validation: Required
• Range: 0-20
• Type: Integer
```

**Use Cases**:
- Age
- Quantities
- Prices
- Percentages

**Validation**:
- Required/Optional
- Min/max range
- Integer vs decimal
- Format (currency, percentage, etc.)

---

### 4.2 Slider

**Purpose**: Select numeric value on a scale

**Type Badge**: "Slider"

**Question ID Format**: Q1, RATE1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Slider component
- Min/max labels
- Current value display
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
0 ────────●──────── 10
```

**Example**:
```
[RATE1] [Slider]

On a scale of 0 to 10, how likely are you to recommend this product to a friend?

0 ────────●──────── 10
Not at all likely          Extremely likely

Current value: 7

[Default → RATE2]
```

**Use Cases**:
- NPS (Net Promoter Score)
- Satisfaction ratings
- Likelihood scales
- Continuous scales

**Validation**:
- Required: Must move slider
- Range: Min to max values
- Step: Increment size

---

## 5. Matrix Question Types

### 5.1 Grid / Matrix (Single Choice per Row)

**Purpose**: Multiple questions with same answer options

**Type Badge**: "Grid / Matrix"

**Question ID Format**: Q1, MAT1, BA1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Column attributes (optional display)
- Scale points (optional display)
- Matrix table with radio buttons
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
Column Attributes
Innovative | Premium quality | Good value | Reliable | Trendy/Stylish | User-friendly

Scale Points
1  Not at all associated
2  Slightly associated
3  Moderately associated
4  Strongly associated
5  Very strongly associated

┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│                 │ Column 1 │ Column 2 │ Column 3 │ Column 4 │ Column 5 │
├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ Row 1           │    ○     │    ○     │    ○     │    ○     │    ○     │
│ Row 2           │    ○     │    ○     │    ○     │    ○     │    ○     │
│ Row 3           │    ○     │    ○     │    ○     │    ○     │    ○     │
└─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Example**:
```
[BA1] [Grid / Matrix]

For each brand you're familiar with, please indicate how strongly you associate them 
with the following characteristics.

Column Attributes
Innovative | Premium quality | Good value | Reliable | Trendy/Stylish | User-friendly

Scale Points
1  Not at all associated
2  Slightly associated
3  Moderately associated
4  Strongly associated
5  Very strongly associated

[Matrix table with brands as rows and scale points as columns]

[Dynamic Options from: BA4]

Notes:
• Validation: Required for all rows
```

**Use Cases**:
- Brand attributes
- Feature ratings
- Agreement scales
- Multiple items with same scale

**Validation**:
- **Required (DEFAULT)**: Must answer all rows - respondent cannot proceed without rating every item
- Optional (RARE): Can skip rows - only use when some items may not be applicable
- Randomize rows: Shuffle row order
- Randomize columns: Shuffle column order

**IMPORTANT**: Always set `requireAllRows: true` unless explicitly specified otherwise in questionnaire

---

### 5.2 Grid / Matrix (Multiple Choice per Row)

**Purpose**: Multiple selections per row

**Type Badge**: "Grid / Matrix (Multi)"

**Structure**: Same as single choice matrix but with checkboxes

**Display**:
```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│                 │ Column 1 │ Column 2 │ Column 3 │ Column 4 │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Row 1           │    ☐     │    ☐     │    ☐     │    ☐     │
│ Row 2           │    ☐     │    ☐     │    ☐     │    ☐     │
│ Row 3           │    ☐     │    ☐     │    ☐     │    ☐     │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

**Use Cases**:
- Multiple selections per item
- Feature comparisons
- Multi-attribute selections

---

## 6. Ranking Question Types

### 6.1 Ranking (Drag and Drop)

**Purpose**: Order items by preference

**Type Badge**: "Ranking"

**Question ID Format**: Q1, RANK1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Draggable items list
- Rank indicators (1, 2, 3, etc.)
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
1. [≡] Item A
2. [≡] Item B
3. [≡] Item C
4. [≡] Item D
```

**Example**:
```
[RANK1] [Ranking]

Please rank the following smartphone features in order of importance to you 
(1 = most important, 5 = least important).

1. [≡] Battery life
2. [≡] Camera quality
3. [≡] Screen size
4. [≡] Processing speed
5. [≡] Storage capacity

[Default → Q15]

Notes:
• Validation: Required
• Drag to reorder
```

**Use Cases**:
- Preference ordering
- Priority ranking
- Feature importance

**Validation**:
- Required: Must rank all items
- Partial ranking: Rank top N items

---

### 6.2 Ranking (Dropdown)

**Purpose**: Order items using dropdowns

**Type Badge**: "Ranking (Dropdown)"

**Structure**:
- Question ID badge
- Type badge
- Question text
- Items with dropdown rank selectors
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
[1 ▼] Item A
[2 ▼] Item B
[3 ▼] Item C
[4 ▼] Item D
```

**Use Cases**:
- Alternative to drag-and-drop
- Better for accessibility
- Mobile-friendly

---

## 7. Scale Question Types

### 7.1 Likert Scale

**Purpose**: Agreement/disagreement scale

**Type Badge**: "Likert Scale"

**Question ID Format**: Q1, LIK1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Radio buttons with scale labels
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
○ Strongly disagree
○ Disagree
○ Neither agree nor disagree
○ Agree
○ Strongly agree
```

**Example**:
```
[LIK1] [Likert Scale]

I am satisfied with my current smartphone.

○ Strongly disagree
○ Disagree
○ Neither agree nor disagree
○ Agree
○ Strongly agree

[Default → LIK2]
```

**Use Cases**:
- Attitude measurement
- Agreement scales
- Satisfaction

**Common Scales**:
- 5-point: Strongly disagree to Strongly agree
- 7-point: Extended scale with more granularity
- 4-point: Forced choice (no neutral)

---

### 7.2 Rating Scale

**Purpose**: Rate on a numeric scale

**Type Badge**: "Rating Scale"

**Question ID Format**: Q1, RATE1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Radio buttons with numeric labels
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
○ 1  ○ 2  ○ 3  ○ 4  ○ 5
```

**Example**:
```
[RATE1] [Rating Scale]

How would you rate the camera quality of your current smartphone?

○ 1  ○ 2  ○ 3  ○ 4  ○ 5
Poor                  Excellent

[Default → RATE2]
```

**Use Cases**:
- Quality ratings
- Performance ratings
- Satisfaction scores

**Common Scales**:
- 1-5: Standard rating
- 1-7: Extended rating
- 1-10: Detailed rating
- 0-10: NPS scale

---

### 7.3 Star Rating

**Purpose**: Visual star-based rating

**Type Badge**: "Star Rating"

**Question ID Format**: Q1, STAR1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Star icons (clickable)
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
☆ ☆ ☆ ☆ ☆
```

**Example**:
```
[STAR1] [Star Rating]

How would you rate your overall experience with this product?

★ ★ ★ ★ ☆  (4 out of 5 stars)

[Default → Q20]
```

**Use Cases**:
- Product reviews
- Service ratings
- User experience

**Common Scales**:
- 5 stars: Standard
- 10 stars: Extended

---

## 8. Date/Time Question Types

### 8.1 Date Picker

**Purpose**: Select a date

**Type Badge**: "Date Picker"

**Question ID Format**: Q1, DATE1, etc.

**Structure**:
- Question ID badge
- Type badge
- Question text
- Date picker input
- Optional: Date range restrictions
- Optional: Metadata badges
- Optional: Notes section

**Display**:
```
[MM/DD/YYYY] 📅
```

**Example**:
```
[DATE1] [Date Picker]

When did you purchase your current smartphone?

[MM/DD/YYYY] 📅

[Default → Q25]

Notes:
• Validation: Required
• Range: Past 5 years only
```

**Use Cases**:
- Purchase dates
- Birth dates
- Event dates

---

## Question Type Selection Guide

| Question Type | Use When | Avoid When |
|--------------|----------|------------|
| Single Choice | One answer needed | Multiple selections needed |
| Multiple Choice | Multiple answers possible | Only one answer needed |
| Dropdown | Long list of options | Short list (use radio) |
| Short Text | Brief response needed | Long explanation needed |
| Long Text | Detailed response needed | Brief response sufficient |
| Number Input | Specific numeric value | Range/scale rating |
| Slider | Continuous scale | Discrete choices |
| Matrix | Multiple items, same scale | Different scales per item |
| Ranking | Order matters | Order doesn't matter |
| Likert | Agreement measurement | Other types of scales |
| Rating | Quality/performance rating | Agreement measurement |
| Date Picker | Specific date needed | Approximate time period |

---

## Validation Rules by Question Type

### Required Validation
- All question types can be required or optional
- Display "Required" in notes section if applicable

### Type-Specific Validation

**Single/Multiple Choice**:
- Min selections
- Max selections
- Exclusive options

**Text Input**:
- Min/max character length
- Pattern matching (email, phone, URL)
- Allowed characters

**Numeric Input**:
- Min/max range
- Integer vs decimal
- Positive/negative

**Matrix**:
- All rows required
- Specific rows required
- No duplicate selections per row

**Ranking**:
- All items ranked
- Top N items ranked

**Date**:
- Date range (min/max)
- Future/past only
- Specific format

---

## Related Documentation

- **Theme Details**: See `survey-ui-theme.md`
- **Structure Specifications**: See `survey-structure-spec.md`
- **Component Specifications**: See `survey-components-spec.md`
- **Logic & Routing**: See `survey-logic-spec.md`

