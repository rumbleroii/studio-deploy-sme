# Text Input Validation Specification

## 🚨 CRITICAL: Schema Structure

**CORRECT Structure** (per types/survey.ts):
```typescript
{
  type: "text",
  text: "Question text",
  required: true,
  validation: [                     // ✅ Array of ValidationRule objects
    { type: "required" },
    { type: "min", value: 5, message: "Min 5 chars" },
    { type: "max", value: 100, message: "Max 100 chars" },
    { type: "pattern", value: "^[a-z]+$", message: "Lowercase only" }
  ],
  metadata: {                       // ✅ Metadata for input configuration
    inputType: "email",             // Input type MUST be in metadata
    placeholder: "Enter value",
    maxLength: 100,
    showCharCount: true,
    trimWhitespace: true,           // Default: true
    rejectWhitespaceOnly: true      // Default: true
  }
}
```

## Validation Rules

### 1. ValidationRule Types

**Available in `validation` array:**

| Rule Type | Purpose | Example |
|-----------|---------|---------|
| `required` | Field must not be empty | `{ type: "required" }` |
| `min` | Minimum character length | `{ type: "min", value: 5, message: "Min 5 chars" }` |
| `max` | Maximum character length | `{ type: "max", value: 100, message: "Max 100 chars" }` |
| `pattern` | Regex pattern match | `{ type: "pattern", value: "^[a-zA-Z]+$", message: "Letters only" }` |

### 2. Input Type Validation

**Set in `metadata.inputType`** - Provides automatic validation:

| Input Type | Auto-Validation | Use Case |
|------------|-----------------|----------|
| `"email"` | Email format validation | Email addresses |
| `"tel"` | Phone number format | Phone numbers |
| `"url"` | URL format validation | Website URLs |
| `"number"` | Numeric validation | Ages, quantities |
| `"text"` | Plain text | Names, general text |
| `"textarea"` | Multi-line text | Long responses |

## Common Validation Patterns

### Email Validation
```typescript
{
  type: "text",
  text: "What is your email address?",
  required: true,
  validation: [
    { type: "required" }
  ],
  metadata: {
    inputType: "email",             // ✅ Automatic email validation
    placeholder: "name@example.com"
  }
}
```

### Phone Number Validation
```typescript
{
  type: "text",
  text: "What is your phone number?",
  required: true,
  validation: [
    { type: "required" },
    { type: "pattern", value: "^[0-9]{10}$", message: "Enter 10-digit number" }
  ],
  metadata: {
    inputType: "tel",
    placeholder: "1234567890",
    maxLength: 10
  }
}
```

### URL Validation
```typescript
{
  type: "text",
  text: "What is your company website?",
  required: true,
  validation: [
    { type: "required" }
  ],
  metadata: {
    inputType: "url",               // ✅ Automatic URL validation
    placeholder: "https://example.com"
  }
}
```

### Numeric Input (Age, Quantity)
```typescript
{
  type: "text",
  text: "What is your age?",
  required: true,
  validation: [
    { type: "required" }
  ],
  metadata: {
    inputType: "number",
    placeholder: "Enter age",
    min: 18,
    max: 120
  }
}
```

### Alphabetic Only (Names)
```typescript
{
  type: "text",
  text: "What is your first name?",
  required: true,
  validation: [
    { type: "required" },
    { type: "pattern", value: "^[a-zA-Z\\s]+$", message: "Letters only" },
    { type: "min", value: 2 }
  ],
  metadata: {
    inputType: "text",
    placeholder: "First name",
    maxLength: 50
  }
}
```

### Alphanumeric (IDs, Codes)
```typescript
{
  type: "text",
  text: "Enter your employee ID",
  required: true,
  validation: [
    { type: "required" },
    { type: "pattern", value: "^[a-zA-Z0-9]+$", message: "Letters and numbers only" },
    { type: "min", value: 5 }
  ],
  metadata: {
    inputType: "text",
    placeholder: "EMP12345",
    maxLength: 15
  }
}
```

### Textarea (Long Text)
```typescript
{
  type: "text",
  text: "Please describe your experience",
  required: true,
  validation: [
    { type: "required" },
    { type: "min", value: 10, message: "Minimum 10 characters" },
    { type: "max", value: 500 }
  ],
  metadata: {
    inputType: "textarea",
    placeholder: "Share your thoughts...",
    rows: 5,
    maxLength: 500,
    showCharCount: true
  }
}
```

## Automatic Features

### 1. Whitespace Handling (Default: Enabled)

**Automatic behavior for all text inputs:**
- **Trim on blur**: Removes leading/trailing whitespace when user leaves field
- **Reject whitespace-only**: Validates that input is not just spaces/tabs/newlines

**Configuration:**
```typescript
metadata: {
  trimWhitespace: true,        // Default: true
  rejectWhitespaceOnly: true   // Default: true
}
```

### 2. Character Counter

**Show character count:**
```typescript
metadata: {
  maxLength: 500,
  showCharCount: true  // Shows "45 / 500" below input
}
```

### 3. Validation Timing

- **On Change**: Clears errors as user types
- **On Blur**: Validates when user leaves field
- **Shows Error**: Displays error message below input

## Exclusive Checkbox Option

For text or numeric questions where respondents may not know or prefer not to answer, add an exclusive checkbox.

**When to use:**
- Questionnaire mentions "EXCLUSIVE" or "Don't know" or "Prefer not to answer"
- Allows respondent to skip the input while still being valid

**Schema:**
```typescript
{
  type: "text",
  text: "What is your annual income?",
  required: true,
  metadata: {
    inputType: "number",
    exclusiveOption: "Prefer not to answer"  // Shows checkbox with this label
  }
}
```

**Behavior:**
- Checkbox appears below the input field
- When checkbox is selected:
  - Input field is disabled and cleared
  - Response is marked valid (can proceed to next question)
- When user types in input:
  - Checkbox is automatically unchecked
- If neither checkbox selected nor input filled:
  - Shows required error

**Common labels:**
- "Don't know"
- "Prefer not to answer"
- "Not applicable"

**Applies to:**
- `type: "text"` (all inputTypes)
- `type: "numeric"`

## Common Patterns by Question Type

| Question Type | Validation Pattern | Example |
|---------------|-------------------|---------|
| Email | `inputType: "email"` | Contact information |
| Phone | `inputType: "tel"` + pattern | Phone numbers |
| Age | `inputType: "number"` + min/max | Demographics |
| Name | Pattern `^[a-zA-Z\\s]+$` | Personal info |
| ID/Code | Pattern `^[a-zA-Z0-9]+$` | Employee IDs |
| URL | `inputType: "url"` | Website links |
| Long text | `inputType: "textarea"` + min/max | Feedback |

## ❌ Common Mistakes

### WRONG: inputType in validation
```typescript
validation: [
  { type: "required", inputType: "email" }  // ❌ WRONG
]
```

### CORRECT: inputType in metadata
```typescript
validation: [
  { type: "required" }  // ✅ CORRECT
],
metadata: {
  inputType: "email"    // ✅ CORRECT
}
```

---

**Always reference types/survey.ts as SOURCE OF TRUTH for schema structure.**
