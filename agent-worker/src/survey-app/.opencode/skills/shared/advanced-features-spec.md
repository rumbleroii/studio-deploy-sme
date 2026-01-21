# Advanced Survey Features Specification

This document defines advanced survey features including loop questions, per-column exclusivity, external metadata piping, and real-time termination warnings.

---

## 1. Loop Questions (Iterator Questions)

### Purpose

Loop questions iterate through each value from a multi-select source question, asking the same question for each selected item individually.

### When to Use

- Rate satisfaction with each selected brand separately
- Collect detailed feedback on each chosen product
- Ask follow-up questions for each item selected in a previous multi-select

### Schema Structure

```typescript
{
  id: 'Q9',
  type: 'multiple_choice',
  text: 'Please select the reason for you to shop at [INSERT LOOP_ITEM LABEL].',
  required: true,
  options: [
    { id: 1, label: 'Convenient location', value: 'location' },
    { id: 2, label: 'Competitive prices', value: 'prices' },
    // ... more options
  ],
  metadata: {
    loopSourceQuestion: 'Q8A',
    loopDisplayTemplate: 'Q9_[LOOP_INDEX]',
    minSelections: 1
  }
}
```

### Metadata Properties

| Property | Type | Description |
|----------|------|-------------|
| `loopSourceQuestion` | `string` | Question ID to iterate through (must be multi-select) |
| `loopDisplayTemplate` | `string` | Template for generating instance IDs |
| `loopItemKey` | `string` | Optional: Key to use from source response |

### Piping Patterns

| Pattern | Description |
|---------|-------------|
| `[INSERT LOOP_ITEM]` | Current loop item value |
| `[INSERT LOOP_ITEM LABEL]` | Current loop item option label |

### Runtime Behavior

1. When reaching a loop question, check `loopSourceQuestion` response
2. Filter out exclusive options (e.g., "None of the above")
3. If items exist, create loop state with items array
4. Present question for first item
5. On "Next", check if more items remain
6. Continue with same question for next item, or proceed to next question

### Response Storage

Responses are stored per loop iteration:

```typescript
{
  "Q9_aldi": ["location", "prices"],
  "Q9_costco": ["quality", "variety"],
  "Q9_walmart": ["prices", "offers"]
}
```

### Skip Logic

If source question has no valid selections (only exclusive options selected), skip the loop question entirely.

---

## 2. Per-Column Exclusivity (Multi-Grid)

### Purpose

In 3D Matrix / Multi-Grid / 3D Grid questions, allow a row (like "Don't Know") to clear only the selections in that column, not all rows entirely.

### Difference from Row Exclusivity

| Feature | Behavior | Validation |
|---------|----------|------------|
| `exclusiveRowIds` | Selecting row clears ALL other rows completely | Row is OPTIONAL; if selected, validation passes immediately |
| `perColumnExclusiveRows` | Selecting row in column X clears only column X in other rows | Row is OPTIONAL; must still answer other required rows |

**Note**: Both `exclusiveRowIds` and `perColumnExclusiveRows` rows are optional in validation - user doesn't need to answer them.

### Schema Structure

```typescript
{
  id: 'Q4',
  type: 'multi_grid',
  text: 'For each feature, indicate availability and usage.',
  matrixRows: [
    { id: 'camera', label: 'Camera' },
    { id: 'battery', label: 'Battery Life' },
    { id: 'other', label: 'Other' },
    { id: 'dk', label: "Don't Know" }
  ],
  matrixColumns: [
    { id: 'available', label: 'Available', value: 'available' },
    { id: 'used_freq', label: 'Used Frequently', value: 'used_frequently' },
    { id: 'used_rarely', label: 'Used Rarely', value: 'used_rarely' }
  ],
  metadata: {
    selectionMode: 'multiple',
    perColumnExclusiveRows: ['dk']
  }
}
```

### Behavior Example

```
User selects: Camera - Available, Battery - Available
User then selects: Don't Know - Available
Result: Camera and Battery "Available" selections cleared, "Don't Know - Available" selected
        Camera and Battery other columns (Used Frequently, Used Rarely) remain unchanged
```

### Visual Indicator

Per-column exclusive rows display "(clears column)" hint below the row label.

---

## 3. External Metadata Piping

### Purpose

Pipe external respondent attributes (like country, currency, user segment) into question text without requiring a survey question.

### Schema Structure

Add `respondentMetadata` to survey definition:

```typescript
{
  id: 'my-survey',
  // ... other survey properties
  respondentMetadata: {
    fields: [
      { key: 'COUNTRY', label: 'Country', defaultValue: 'USA' },
      { key: 'CURRENCY', label: 'Currency Symbol', defaultValue: '$' },
      { key: 'USER_SEGMENT', label: 'User Segment', defaultValue: 'standard' }
    ]
  }
}
```

### Piping Pattern

Use `[INSERT META:KEY]` syntax in question text:

```typescript
{
  id: 'Q5',
  type: 'numeric',
  text: 'How much do you spend monthly on subscriptions? ([INSERT META:CURRENCY])'
}
```

### Runtime

1. Metadata values can be set:
   - From URL parameters
   - From embedded survey data
   - From API pre-population
   - Default values in schema

2. `applyPiping()` function handles `[INSERT META:KEY]` patterns

---

## 4. Real-Time Termination Warnings

### Purpose

Show a visual warning when user enters text that would trigger termination, before they submit.

### Schema Structure

```typescript
{
  id: 'Q6',
  type: 'text',
  text: 'Please share your feedback.',
  required: true,
  logic: [
    {
      action: 'terminate',
      when: { operator: 'contains', left: 'Q6', right: 'Terrible' },
      destination: 'TERM1'
    }
  ],
  metadata: {
    inputType: 'textarea',
    terminationPattern: 'Terrible',
    terminationWarning: 'Warning: This response may end the survey.'
  }
}
```

### Metadata Properties

| Property | Type | Description |
|----------|------|-------------|
| `terminationPattern` | `string` | Regex pattern or string to match (case-insensitive) |
| `terminationWarning` | `string` | Warning message to display |

### Behavior

1. On text input change, check if value matches `terminationPattern`
2. If match found, display amber warning banner below input
3. Warning disappears when text no longer matches pattern
4. Termination still evaluated on "Next" click via normal logic

### UI Display

```
┌─────────────────────────────────────────────────────┐
│ [Your text input here...]                           │
└─────────────────────────────────────────────────────┘

┌─ ⚠️ ───────────────────────────────────────────────┐
│ Warning: This response may end the survey.          │
└────────────────────────────────────────────────────┘
```

---

## 5. Always-Visible "Other" Row Input (Matrix)

### Purpose

Show the "Other (specify)" text input field even before the row is selected, improving UX clarity.

### Schema Structure

```typescript
{
  id: 'Q4',
  type: 'multi_grid',
  metadata: {
    rowOtherSpecify: [
      {
        rowId: 'other',
        required: true,
        placeholder: 'Please specify the feature',
        alwaysVisible: true
      }
    ]
  }
}
```

### Behavior

| `alwaysVisible` | Behavior |
|-----------------|----------|
| `false` (default) | Text input appears only after row has a selection |
| `true` | Text input always visible in a sub-row below the "Other" row |

---

## Type Definitions

### LoopQuestionMetadata

```typescript
interface LoopQuestionMetadata {
  loopSourceQuestion: string;
  loopItemKey?: string;
  loopDisplayTemplate?: string;
}
```

### MultiGridMetadata (Updated)

```typescript
interface MultiGridMetadata {
  selectionMode: 'single' | 'multiple';
  maxPerColumn?: number;
  columnExclusiveOptions?: (string | number)[];
  otherRowIds?: string[];
  exclusiveRowIds?: string[];
  perColumnExclusiveRows?: string[];
  rowOtherSpecify?: {
    rowId: string;
    required?: boolean;
    placeholder?: string;
    alwaysVisible?: boolean;
  }[];
}
```

### TextMetadata (Updated)

```typescript
interface TextMetadata {
  inputType?: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  exclusiveOption?: string;
  terminationPattern?: string;
  terminationWarning?: string;
}
```

### RespondentMetadataConfig

```typescript
interface RespondentMetadataConfig {
  fields: RespondentMetadataField[];
}

interface RespondentMetadataField {
  key: string;
  label: string;
  defaultValue?: string;
  pipingKey?: string;
}
```

---

## Implementation Checklist

### Loop Questions
- [ ] Add `loopSourceQuestion` to question metadata
- [ ] Use `[INSERT LOOP_ITEM LABEL]` piping in question text
- [ ] Ensure source question is multi-select
- [ ] Test with various selection counts (1, 3, max)

### Per-Column Exclusivity
- [ ] Use `perColumnExclusiveRows` instead of `exclusiveRowIds` for column-scoped clearing
- [ ] Verify "(clears column)" hint displays

### External Metadata
- [ ] Define `respondentMetadata.fields` in survey
- [ ] Use `[INSERT META:KEY]` pattern in question text
- [ ] Set default values for all metadata fields

### Real-Time Termination Warnings
- [ ] Add `terminationPattern` and `terminationWarning` to text question metadata
- [ ] Ensure termination logic also exists in question's logic array
- [ ] Test warning appears/disappears on text change
