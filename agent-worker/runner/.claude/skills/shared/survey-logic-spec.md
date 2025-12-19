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

**Implementation**:
```json
{
  "randomization": {
    "enabled": true,
    "anchored": [6, 99],
    "type": "options"
  }
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

### 5.1 Text Piping

**Purpose**: Insert previous answer into question text

**Supported Formats**:

1. **Raw Response Value**: `[INSERT QUESTIONID]` or `[INSERT QUESTIONID RESPONSE]`
   - Returns the actual answer value
   - For multiple choice: returns comma-separated values
   - Example: `[INSERT Q1]` → `"banana"` or `[INSERT Q4 RESPONSE]` → `"option1, option2"`

2. **Option Label**: `[INSERT QUESTIONID LABEL]`
   - Returns the display label(s) of selected option(s)
   - For single choice: returns one label
   - For multiple choice: returns comma-separated labels
   - Example: `[INSERT Q1 LABEL]` → `"Strongly Agree"`

3. **Legacy Custom Patterns** (backward compatibility):
   - `[INSERT Q4.SUM]` - Custom calculation (sum of selected service prices)
   - `[INSERT CONCEPT NAME]` - Custom concept name lookup

**Example in Question Text**:
```typescript
// Raw value piping
text: "You mentioned [INSERT Q1]. Can you elaborate on why you chose that?"

// Label piping (shows "Strongly Agree" instead of value "5")
text: "You selected [INSERT Q1 LABEL]. Can you explain why?"

// Multiple choice label piping
text: "You selected [INSERT Q4 LABEL]. Would you like to add more?"

// Legacy custom piping
text: "Would you add these services for $[INSERT Q4.SUM]/month?"
```

**Behavior**:
- Placeholders are replaced with actual answers in real-time
- If answer is empty, shows `[No response]` or `[No selection]`
- Updates dynamically as answers change
- Works in both respondent view and authoring view

**Implementation**:
```typescript
// In question schema
{
  id: 'Q5',
  type: 'single_choice',
  text: 'You selected [INSERT Q1 LABEL]. How satisfied are you with this choice?',
  // No separate piping array needed - patterns detected automatically
}

// The applyPiping function handles this automatically:
// applyPiping(question.text, responses, allQuestions)
```

---

### 5.2 Loop Piping

**Purpose**: Repeat question for each selected option

**Format**: `{{loop.item}}`

**Example**:
```
Rate your experience with {{loop.item}}

Loop over: Q2 (multi-select brands)
```

**Behavior**:
- Create one question instance per selected option
- Replace `{{loop.item}}` with current option label
- Collect separate answer for each

**Use Cases**:
- Rate each selected brand
- Describe each selected feature
- Evaluate each chosen option

---

## 6. Validation Logic

### 6.1 Required Validation

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

### 6.2 Range Validation

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

### 6.3 Format Validation

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

### 6.4 Custom Validation

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

## 7. Quota Logic

### 7.1 Quota Display

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

### 7.2 Quota Full Termination

**Behavior**:
- Check quota status after screener questions
- If quota full, route to TERM screen
- Display quota full message

**Example**:
```
[IF quota_full(age_18_34) → TERM2]
```

---

## 8. Logic Evaluation Order

### Priority Order:
1. **Show/Hide Conditions** - Evaluate first to determine visibility
2. **Validation** - Check if answer is valid
3. **Conditional Navigation** - Evaluate in order defined
4. **Default Navigation** - Use if no conditions match
5. **Piping** - Replace placeholders after navigation determined

### Evaluation Timing:
- **On Page Load**: Show/hide conditions, piping
- **On Answer Change**: Show/hide conditions, validation, piping
- **On Next Click**: Validation, navigation logic

---

## 9. Logic Display Guidelines

### 9.1 Badge Placement
- **Always** in metadata row below question options
- **Order**: Default → Conditional → Randomization → Show Condition → Dynamic Options
- **Spacing**: 8px gap between badges
- **Wrapping**: Allow wrapping to multiple lines if needed

### 9.2 Badge Content
- **Concise**: Keep text brief
- **Clear**: Use plain language
- **Consistent**: Use same format for same logic type
- **Complete**: Include all relevant information

### 9.3 Complex Logic
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

## 10. Logic Conflict Detection

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

---

## 11. Logic Implementation Patterns

### 11.1 Simple Skip Logic
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

### 11.2 Multiple Conditions
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

### 11.3 Show Condition
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

### 11.4 Randomization
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

### 11.5 Dynamic Options
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

### 11.6 Piping
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

---

## 12. Testing Logic

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
- [ ] Test with various answers
- [ ] Test with empty answers
- [ ] Verify default text

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

