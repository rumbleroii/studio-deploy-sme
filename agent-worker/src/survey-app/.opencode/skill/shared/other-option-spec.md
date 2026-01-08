# "Other (Please Specify)" Option Specification

**Purpose**: Define how to handle "Other","please specify" options that reveal conditional text input fields when selected.

---

## Overview

"Other (please specify)" options allow respondents to provide custom responses when predefined options don't fit their answer. When selected, a text input field appears for free-text entry.

### Key Behavior

1. **Initially**: Text input is **hidden**
2. **When "Other" selected**: Text input **appears** below the option
3. **When "Other" deselected**: Text input **disappears** and value is cleared
4. **Validation**: If "Other", "please specify" is selected, text input is typically **required**

---

## Question Types Supporting "Other" Options

### 1. Single Choice (Radio Buttons)
- One "Other" option allowed
- When selected, text input appears
- Selecting different option hides text input

### 2. Multiple Choice (Checkboxes)
- One or more "Other" options allowed
- Each "Other" option can have its own text input
- Checking "Other" shows input, unchecking hides it

### 3. Dropdown (Select)
- One "Other" option in list
- When selected from dropdown, text input appears below

---

## Schema Structure

### Single Choice with "Other"

```typescript
{
  id: "Q1",
  type: "single_choice",
  text: "What is your primary mode of transportation?",
  required: true,
  options: [
    { id: 1, label: "Car", value: "car" },
    { id: 2, label: "Bus", value: "bus" },
    { id: 3, label: "Train", value: "train" },
    { id: 4, label: "Bicycle", value: "bicycle" },
    { id: 5, label: "Walk", value: "walk" },
    { id: 99, label: "Other (please specify)", value: "other" }
  ],
  metadata: {
    hasOtherOption: true,              // Enable "Other" text input functionality
    otherOptionId: 99,                 // Which option ID triggers the text input
    otherInputRequired: true,          // Text input required when "Other" selected
    otherInputPlaceholder: "Please specify",
    otherInputMaxLength: 100
  },
  validation: [
    { type: 'required', message: 'Please select an option' }
  ]
}
```

### Multiple Choice with "Other"

```typescript
{
  id: "Q5",
  type: "multiple_choice",
  text: "Which smartphone brands are you familiar with? (Select all that apply)",
  required: true,
  options: [
    { id: 1, label: "Apple", value: "apple" },
    { id: 2, label: "Samsung", value: "samsung" },
    { id: 3, label: "Google", value: "google" },
    { id: 4, label: "OnePlus", value: "oneplus" },
    { id: 99, label: "Other (please specify)", value: "other" },
    { id: 0, label: "None of the above", value: "none" }
  ],
  metadata: {
    hasOtherOption: true,
    otherOptionId: 99,
    otherInputRequired: true,
    otherInputPlaceholder: "Please specify brand",
    otherInputMaxLength: 50,
    minSelections: 1,
    exclusiveOptions: [0]              // "None of the above" deselects all others
  },
  validation: [
    { type: 'required', message: 'Please select at least one option' }
  ]
}
```

### Multiple "Other" Options (Rare)

**NOTE**: Current implementation supports ONE "Other", "please specify" option per question. Multiple "Other" options would require enhancement.

**Recommended approach**: Use a single "Other" option:

```typescript
{
  id: "Q10",
  type: "multiple_choice",
  text: "What issues did you experience? (Select all that apply)",
  required: true,
  options: [
    { id: 1, label: "Battery drain", value: "battery" },
    { id: 2, label: "Screen issues", value: "screen" },
    { id: 3, label: "Audio problems", value: "audio" },
    { id: 99, label: "Other issue (please specify)", value: "other" }
  ],
  metadata: {
    hasOtherOption: true,
    otherOptionId: 99,
    otherInputRequired: true,
    otherInputPlaceholder: "Describe the issue",
    otherInputMaxLength: 200
  },
  validation: [
    { type: 'required', message: 'Please select at least one option' }
  ]
}
```

---

## Questionnaire Patterns to Detect

### Common Patterns

Look for these patterns in questionnaires to identify "Other" options:

1. **"Other (please specify)"** - Most common
2. **"Other (specify)"**
3. **"Other: ___________"** - Underscore indicates text field
4. **"Other, please describe"**
5. **"Something else (explain)"**
6. **"None of the above/Other"** - Combined option

### Pattern Examples

```
Example 1: Explicit "Other" with indicator
○ Option 1
○ Option 2
○ Option 3
○ Other (please specify) _________________

→ Generate as option with hasOtherOption: true
```

```
Example 2: "Other" with colon
☐ Feature A
☐ Feature B
☐ Other: [text box appears]

→ Generate as option with hasOtherOption: true
```

```
Example 3: Multiple specifications
○ Primary reason 1
○ Primary reason 2
○ Other reason (please explain in detail)

→ Generate with hasOtherOption: true, longer maxLength
```

---

## UI Implementation

### HTML Structure

```html
<div class="question-option">
  <!-- Radio button or checkbox -->
  <label class="option-container">
    <input
      type="radio"
      name="Q1"
      value="99"
      id="Q1_99"
      onchange="handleOtherOptionChange(this)"
    />
    <span class="option-label">Other (please specify)</span>
  </label>

  <!-- Conditional text input (initially hidden) -->
  <div class="other-input-container" id="Q1_99_other" style="display: none;">
    <input
      type="text"
      name="Q1_99_text"
      class="other-text-input"
      placeholder="Please specify"
      maxlength="100"
      aria-label="Specify other option"
    />
  </div>
</div>
```

### CSS Styling

```css
.other-input-container {
  margin-left: 32px; /* Indent under the option */
  margin-top: 8px;
  transition: all 0.2s ease-in-out;
}

.other-text-input {
  width: 100%;
  max-width: 400px;
  border: 1px solid #BDBDBD;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 14px;
  font-family: inherit;
  color: #1A1A1A;
}

.other-text-input:focus {
  outline: none;
  border-color: #3D1C35;
  box-shadow: 0 0 0 2px rgba(61, 28, 53, 0.1);
}

.other-text-input::placeholder {
  color: #BDBDBD;
  font-style: italic;
}
```

### JavaScript Logic

```javascript
function handleOtherOptionChange(radioOrCheckbox) {
  const optionValue = radioOrCheckbox.value;
  const questionId = radioOrCheckbox.name;
  const otherId = `${questionId}_${optionValue}_other`;
  const otherContainer = document.getElementById(otherId);

  if (radioOrCheckbox.checked) {
    // Show text input
    otherContainer.style.display = 'block';

    // Focus on text input
    const textInput = otherContainer.querySelector('input[type="text"]');
    setTimeout(() => textInput.focus(), 100);

    // Mark as required if needed
    if (radioOrCheckbox.dataset.otherRequired === 'true') {
      textInput.setAttribute('required', 'required');
    }
  } else {
    // Hide text input and clear value
    otherContainer.style.display = 'none';
    const textInput = otherContainer.querySelector('input[type="text"]');
    textInput.value = '';
    textInput.removeAttribute('required');
  }
}

// For radio buttons: hide other "Other" inputs when different option selected
function handleRadioChange(questionId, selectedValue, allOptions) {
  allOptions.forEach(option => {
    if (option.hasOtherOption && option.id !== selectedValue) {
      const otherId = `${questionId}_${option.id}_other`;
      const otherContainer = document.getElementById(otherId);
      if (otherContainer) {
        otherContainer.style.display = 'none';
        const textInput = otherContainer.querySelector('input[type="text"]');
        if (textInput) {
          textInput.value = '';
          textInput.removeAttribute('required');
        }
      }
    }
  });
}
```

---

## Validation Rules

### When "Other" is Selected

1. **Text input becomes required** (if `otherInputRequired: true`)
2. **Minimum length**: Usually 1 character (non-empty, AFTER trimming)
3. **Maximum length**: Typically 50-200 characters
4. **Pattern validation**: Optional (e.g., no special characters)
5. **Whitespace handling**: CRITICAL - Trim and reject whitespace-only

### Validation Behavior

**When user clicks "Next" button without entering text:**
- Validation runs automatically via `validateResponse()` function
- If "Other" is selected but text is empty/missing → Error message displayed: "Please enter your answer in the text box when selecting 'Other (please specify)'"
- User cannot proceed to next question until valid text is entered
- Error appears in red error box below the question

### Validation Messages

```typescript
{
  otherOptionSelected: "Please specify your answer",
  otherOptionWhitespaceOnly: "Please enter a valid response (not just spaces)",
  otherOptionTooShort: "Please provide more detail",
  otherOptionTooLong: "Response is too long (max {maxLength} characters)"
}
```

### Schema Validation Structure

```typescript
{
  id: "99",
  label: "Other (please specify)",
  hasOtherOption: true,
  otherInputValidation: {
    required: true,              // Required when option selected
    minLength: 1,                // Minimum characters (after trimming)
    maxLength: 100,              // Maximum characters
    trimWhitespace: true,        // CRITICAL: Always trim on blur and submit
    rejectWhitespaceOnly: true,  // CRITICAL: Reject "   " as invalid
    pattern: null,               // Optional regex pattern
    errorMessages: {
      required: "Please specify your answer",
      whitespaceOnly: "Please enter a valid response (not just spaces)",
      minLength: "Please provide at least 1 character",
      maxLength: "Maximum 100 characters allowed"
    }
  }
}
```

**IMPORTANT**: "Other" text inputs MUST follow the same whitespace validation rules as all other text inputs:
- Trim on blur and before submit
- Reject whitespace-only input
- Calculate length after trimming

---

## Data Storage

### Response Data Structure

When "Other" option is selected, store both the option ID and the text value:

```typescript
// Single choice with "Other"
{
  questionId: "Q1",
  response: {
    optionId: "99",
    optionLabel: "Other (please specify)",
    otherText: "Electric scooter"  // User's custom text
  }
}

// Multiple choice with "Other"
{
  questionId: "Q5",
  response: [
    { optionId: "1", optionLabel: "Apple" },
    { optionId: "2", optionLabel: "Samsung" },
    {
      optionId: "99",
      optionLabel: "Other (please specify)",
      otherText: "Xiaomi"  // User's custom text
    }
  ]
}
```

### Database Schema

```sql
CREATE TABLE survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER,
  question_id VARCHAR(50),
  respondent_id VARCHAR(100),
  option_id VARCHAR(50),
  option_label TEXT,
  other_text TEXT,        -- Stores "Other" option text
  created_at TIMESTAMP
);
```

---

## Common Use Cases

### Use Case 1: Demographics

```
[Q_GENDER] [Single Choice]

What is your gender?

○ Male
○ Female
○ Non-binary
○ Prefer not to say
○ Prefer to self-describe (please specify) [text input]
```

### Use Case 2: Product Feedback

```
[Q_ISSUE] [Multiple Choice]

What issues did you encounter? (Select all that apply)

☐ Slow performance
☐ App crashes
☐ Login problems
☐ Payment issues
☐ Other (please describe) [text input]
```

### Use Case 3: Brand Awareness

```
[BA1] [Multiple Choice]

Which of these brands have you heard of? (Select all that apply)

☐ Brand A
☐ Brand B
☐ Brand C
☐ Brand D
☐ Other brand (specify) [text input]
☐ None of the above
```

---

## Best Practices

### 1. Placement
- **Always place "Other" near the end** of the option list
- Place before "None of the above" or "Prefer not to say"
- Typical order: Regular options → Other → None/Prefer not to say

### 2. Labeling
- **Be explicit**: Use "Other (please specify)" not just "Other"
- **Be specific** if context helps: "Other brand (specify)", "Other reason (explain)"
- **Consistent wording** across survey

### 3. Validation
- **Make text input required** when "Other" selected (prevents empty selections)
- **Set reasonable character limits**: 50-100 for short answers, 200-500 for descriptions
- **Don't make it too restrictive**: Allow spaces, hyphens, common punctuation

### 4. Accessibility
- **Label association**: Text input must have proper aria-label
- **Focus management**: Auto-focus on text input when option selected
- **Keyboard navigation**: Tab order should be logical
- **Screen readers**: Announce when text input appears

### 5. Mobile Optimization
- **Larger touch targets**: Ensure radio/checkbox + text input both easy to tap
- **Keyboard handling**: Show appropriate keyboard (text, email, number based on context)
- **Input visibility**: Ensure text input doesn't get hidden behind mobile keyboard

---

## Generation Checklist

When parsing questionnaires, check for "Other" options:

- [ ] Identify "Other" patterns (see "Questionnaire Patterns to Detect")
- [ ] Add "Other" as a regular option: `{ id: 99, label: "Other (please specify)", value: "other" }`
- [ ] Add `hasOtherOption: true` to **question.metadata** (NOT on option object)
- [ ] Add `otherOptionId: 99` to **question.metadata** to specify which option ID triggers text input
- [ ] Set `otherInputRequired: true` in metadata (default - makes text required when "Other" selected)
- [ ] Add `otherInputPlaceholder` in metadata (e.g., "Please specify")
- [ ] Set `otherInputMaxLength` in metadata (50-100 typical, 200+ for detailed responses)
- [ ] Ensure option ID is unique (commonly 99 for single "Other")
- [ ] Place "Other" near end of options list
- [ ] Document in notes section if custom behavior needed

---

## Component Implementation

**IMPORTANT**: The "Other, "please specify" option functionality is already fully implemented in `/components/QuestionRenderer.tsx`.

### How It Works

The implementation uses **metadata-based detection**:

1. Check `question.metadata.hasOtherOption` to enable the feature
2. Use `question.metadata.otherOptionId` to identify which option triggers the text input
3. When that option is selected, render a text input below it
4. Apply all metadata properties: `otherInputRequired`, `otherInputPlaceholder`, `otherInputMaxLength`

**You do NOT need to modify component code**. Simply structure your question with the correct metadata as shown in the "Schema Structure" section above, and the text input will automatically appear.

---

## ✅ Current Implementation Status

**File**: `/components/QuestionRenderer.tsx`
**Status**: ✅ FULLY IMPLEMENTED

### Implemented Features

1. **Metadata-Based Detection**
   - Reads `question.metadata.hasOtherOption` to enable functionality
   - Uses `question.metadata.otherOptionId` to identify "Other" options
   - Supports all metadata properties: `otherInputRequired`, `otherInputPlaceholder`, `otherInputMaxLength`

2. **State Management**
   - `otherTextValues` state tracks text inputs for all "Other" options
   - Text values stored with special key: `{questionId}_other_{optionValue}`
   - Automatic cleanup when "Other" option is deselected

3. **Single Choice Implementation** (Lines 78-143)
   - Text input appears when "Other" radio button is selected
   - Text input disappears when different option is selected
   - Previous "Other" text is cleared when switching options

4. **Multiple Choice Implementation** (Lines 157-201)
   - Text input appears when "Other" checkbox is checked
   - Text input disappears when "Other" checkbox is unchecked
   - Multiple "Other" options supported independently
   - Text cleared when checkbox is unchecked

5. **Whitespace Validation** (Lines 65-74)
   - Automatic trimming on blur via `handleOtherTextBlur()`
   - Follows Section 3.0 of survey-question-types.md
   - Trims leading/trailing whitespace
   - Updates both state and responses

6. **UI/UX Features**
   - Text input indented 12px (`ml-12`) below option
   - Styled with consistent border and focus states
   - Placeholder text from metadata or default "Please specify"
   - Character limit enforced via `maxLength` attribute
   - Required indicator shown when `otherInputRequired: true`

### Usage Example

To add "Other (please specify)" option to a question:

```typescript
{
  id: "Q1",
  type: "single_choice",
  text: "What is your role?",
  required: true,
  options: [
    { id: 1, label: "Manager", value: "manager" },
    { id: 2, label: "Developer", value: "developer" },
    { id: 99, label: "Other (please specify)", value: "other" }
  ],
  metadata: {
    hasOtherOption: true,
    otherOptionId: 99,
    otherInputRequired: true,
    otherInputMaxLength: 100,
    otherInputPlaceholder: "Please specify your role"
  }
}
```

The text input will automatically appear when option 99 is selected.

### Response Data Format

When "Other" option is selected, responses are stored as:
- **Option selection**: `responses[questionId] = "other"`
- **Other text**: `responses["{questionId}_other_other"] = "Custom text here"`

---

## Testing Checklist

Before deploying, test "Other" option behavior:

- [ ] Text input **hidden** by default
- [ ] Text input **appears** when option selected
- [ ] Text input **disappears** when option deselected (checkbox)
- [ ] Text input **clears** when different option selected (radio)
- [ ] Focus **moves to text input** when option selected
- [ ] Validation **triggers** if required and left empty
- [ ] Character limit **enforced**
- [ ] **Keyboard navigation** works correctly
- [ ] **Screen reader** announces text input appearance
- [ ] **Mobile keyboard** appears when text input focused
- [ ] **Data saves correctly** with both option ID and text value
- [ ] **Multiple "Other" options** work independently (if applicable)

---

## Related Documentation

- **survey-question-types.md**: Single Choice and Multiple Choice specifications
- **survey-components-spec.md**: Input component specifications
- **survey-logic-spec.md**: Conditional display logic

---

**Remember**: "Other" options are about giving respondents flexibility when predefined options don't fit. Always make the text input required when "Other" is selected to prevent meaningless data.
