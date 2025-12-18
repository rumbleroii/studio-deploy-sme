# Survey Logic Documentation

This document details all the **termination** and **routing/skip logic** added to the Verizon Business Wireless Survey.

---

## Original Questionnaire Logic

The original `sample.txt` questionnaire had **limited logic**:
- ✅ Show/hide conditions (ASK IF...)
- ❌ No termination logic
- ❌ No skip/routing logic

### Original Logic:
1. **Q6**: ASK IF CUSTOMER.TYPE = VERIZON CUSTOMER
2. **Q7**: ASK IF specific concept and service selected in Q4
3. **Q8**: ASK IF specific concept and service NOT selected in Q4

---

## Enhanced Logic Added

### 1. Termination Logic

Respondents are **terminated** (sent to termination screen) if they don't qualify:

#### **S1: Decision Maker Question** (NEW)
- **Question**: "Are you involved in making decisions about your company's wireless service provider or plan?"
- **Options**:
  - Yes, I am the primary decision maker
  - Yes, I am involved in the decision
  - ❌ No, I am not involved in these decisions
- **Logic**:
  ```
  IF S1 = "not_involved" → TERMINATE
  ```
- **Reason**: Survey targets decision makers only

#### **S11: Number of Lines**
- **Question**: "How many wireless lines does your company currently have?"
- **Logic**:
  ```
  IF S11 < 10 → TERMINATE
  ```
- **Reason**: Company too small for business study (requires minimum 10 lines)

#### **CUSTOMER_TYPE: Primary Carrier**
- **Question**: "Which wireless carrier does your company primarily use?"
- **Options**: Verizon, T-Mobile, AT&T, Other
- **Logic**:
  ```
  IF CUSTOMER_TYPE = "other" → TERMINATE
  ```
- **Reason**: Survey focuses on top 3 carriers only

---

### 2. Skip/Routing Logic

Respondents **skip questions** based on their answers to optimize survey flow:

#### **Q4: Service Selection**
- **Question**: "Which services would you be interested in adding?"
- **Logic**:
  ```
  IF Q4 = ["none"] AND Q4.length = 1 → SKIP to Q8
  ```
- **Reason**: If not interested in ANY services, skip pricing questions (Q5, Q5a, Q6, Q7) and go directly to reasons (Q8)

#### **Q5: Likelihood to Add Services**
- **Question**: "How likely would you be to add these services for $X/month?"
- **Logic**:
  ```
  IF Q5 = "definitely_not" → SKIP to Q8
  ```
- **Reason**: If definitely not interested, skip follow-up evaluation questions (Q5a, Q6, Q7) and go to reasons (Q8)

---

## Complete Logic Flow Diagram

```
START
  ↓
S1: Decision Maker?
  ├─ No → TERMINATE (not qualified)
  └─ Yes → Continue
       ↓
S11: Number of Lines?
  ├─ < 10 → TERMINATE (company too small)
  └─ ≥ 10 → Continue
       ↓
CUSTOMER_TYPE: Primary Carrier?
  ├─ Other → TERMINATE (not target carrier)
  └─ Verizon/T-Mobile/AT&T → Continue
       ↓
CONCEPT_ASSIGNMENT: Introduction
       ↓
Q4: Service Selection
  ├─ ONLY "None" → SKIP to Q8
  └─ Selected services → Continue
       ↓
Q5: Likelihood at Price
  ├─ "Definitely would not" → SKIP to Q8
  └─ Other → Continue
       ↓
Q5a: Likelihood by Carrier
       ↓
Q6: Action if Plan Doesn't Qualify
  ├─ SHOW IF: CUSTOMER_TYPE = "verizon"
  └─ HIDE IF: CUSTOMER_TYPE ≠ "verizon"
       ↓
Q7: % of Lines to Add
  ├─ SHOW IF: Specific concept service selected in Q4
  └─ HIDE IF: Service not selected
       ↓
Q8: Reasons for Not Selecting
  ├─ SHOW IF: Specific concept service NOT selected in Q4
  └─ HIDE IF: Service selected
       ↓
COMPLETE (Thank You)
```

---

## Logic Implementation Details

### Termination Logic

**Type**: `action: 'terminate'`

**Implementation**:
```typescript
logic: [
  {
    action: 'terminate',
    when: {
      operator: 'eq',      // or 'lt', 'gt', etc.
      left: 'QUESTION_ID',
      right: 'value'
    },
    destination: 'TERMINATE'
  }
]
```

**Result**: Respondent sent to `/s/[surveyId]/terminate` page

---

### Skip Logic

**Type**: `action: 'skip'`

**Implementation**:
```typescript
logic: [
  {
    action: 'skip',
    when: {
      operator: 'eq',      // condition
      left: 'QUESTION_ID',
      right: 'value'
    },
    destination: 'TARGET_QUESTION_ID'
  }
]
```

**Result**: Respondent navigates directly to destination question, skipping intermediate questions

---

### Show/Hide Logic

**Type**: `action: 'show'` or `action: 'hide'`

**Implementation**:
```typescript
logic: [
  {
    action: 'show',
    when: {
      operator: 'eq',
      left: 'QUESTION_ID',
      right: 'value'
    }
  }
]
```

**Result**: Question only displayed if condition is met

---

## Advanced Logic Features

### 1. Compound Conditions (AND/OR)

**Example**: Q4 skip logic checks BOTH conditions:
```typescript
{
  operator: 'and',
  conditions: [
    { operator: 'in', left: 'Q4', right: ['none'] },
    { operator: 'eq', left: 'Q4.length', right: 1 }
  ]
}
```

### 2. Property Access

**Example**: Checking array length:
```typescript
{ operator: 'eq', left: 'Q4.length', right: 1 }
```

### 3. Array Operators

**Examples**:
- `in`: Check if value in array
- `notIn`: Check if value NOT in array
- `contains`: Check if array contains value

---

## Testing the Logic

### Test Termination Scenarios

1. **Test S1 Termination**:
   - Select "No, I am not involved in these decisions"
   - Should immediately terminate

2. **Test S11 Termination**:
   - Enter a number < 10 (e.g., 5)
   - Should terminate after clicking Next

3. **Test CUSTOMER_TYPE Termination**:
   - Select "Other"
   - Should terminate

### Test Skip Scenarios

4. **Test Q4 Skip**:
   - Select ONLY "None of the above" in Q4
   - Should skip directly to Q8

5. **Test Q5 Skip**:
   - Select services in Q4
   - Select "Definitely would not" in Q5
   - Should skip to Q8

### Test Show/Hide Logic

6. **Test Q6 Show (Verizon)**:
   - Select "Verizon" in CUSTOMER_TYPE
   - Q6 should appear after Q5a

7. **Test Q6 Hide (Non-Verizon)**:
   - Select "T-Mobile" or "AT&T" in CUSTOMER_TYPE
   - Q6 should NOT appear (skip from Q5a to Q7/Q8)

8. **Test Q7 Show**:
   - Select concept-specific service in Q4
   - Q7 should appear asking for % of lines

9. **Test Q8 Show**:
   - Do NOT select concept-specific service in Q4
   - Q8 should appear asking for reasons

---

## Logic Evaluation Engine

**File**: `lib/logic-evaluator.ts`

**Key Functions**:

1. **`evaluateExpression()`**: Evaluates logic conditions
2. **`shouldShowQuestion()`**: Determines if question should be shown
3. **`getNextQuestionId()`**: Calculates next question based on logic
4. **`validateResponse()`**: Validates responses before allowing Next

**Supported Operators**:
- `eq`, `neq` (equality)
- `gt`, `lt`, `gte`, `lte` (comparison)
- `in`, `notIn` (array membership)
- `contains` (substring/array contains)
- `and`, `or` (compound conditions)

---

## Summary of Changes

### New Questions Added
- ✅ **S1**: Decision maker qualification question

### Termination Points Added
- ✅ **S1**: Not a decision maker → Terminate
- ✅ **S11**: < 10 lines → Terminate
- ✅ **CUSTOMER_TYPE**: "Other" carrier → Terminate

### Skip Logic Added
- ✅ **Q4**: Only "none" selected → Skip to Q8
- ✅ **Q5**: "Definitely would not" → Skip to Q8

### Existing Show/Hide Logic
- ✅ **Q6**: Show only for Verizon customers
- ✅ **Q7**: Show if concept service selected
- ✅ **Q8**: Show if concept service NOT selected

---

## Impact on Survey Flow

### Before Logic Enhancement
- All respondents saw all questions
- No qualification screening
- No intelligent routing

### After Logic Enhancement
- ✅ Qualified respondents only (decision makers, 10+ lines, target carriers)
- ✅ Efficient routing (skip irrelevant questions)
- ✅ Better data quality (only collect data from qualified, interested respondents)
- ✅ Shorter survey time for uninterested respondents
- ✅ Professional termination messaging

---

**Result**: The survey now has **professional-grade logic** comparable to enterprise survey platforms like Qualtrics, Decipher, or SurveyMonkey.
