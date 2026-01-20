# Matrix Question Implementation Guide

**Purpose**: This guide provides crystal-clear instructions for implementing matrix/grid questions correctly, addressing common generation failures.

---

## Understanding Matrix Question Structure

Matrix questions have **3 core elements**:

1. **Rows**: Items being rated (brands, features, statements)
2. **Columns**: Rating scale or categories (1-5, Agree/Disagree, Yes/No)
3. **Cells**: Radio buttons or checkboxes for selection

### Common Matrix Patterns in Market Research

#### Pattern A: Single-Attribute Rating Matrix
**Most Common** - Rate multiple items on ONE attribute using a scale.

```
Question: How satisfied are you with the following features?

Rows (items):     Columns (scale):
- Battery life    [1] [2] [3] [4] [5]
- Camera quality  [1] [2] [3] [4] [5]
- Screen size     [1] [2] [3] [4] [5]

Scale Labels:
1 = Very dissatisfied
2 = Dissatisfied
3 = Neutral
4 = Satisfied
5 = Very satisfied
```

#### Pattern B: Multi-Attribute Brand Association Matrix
**Complex** - Rate brands (rows) on multiple attributes (columns).

```
Question: For each brand, rate how strongly you associate it with the following:

             Innovative  Premium  Good Value  Reliable
Apple        [1-5]       [1-5]    [1-5]       [1-5]
Samsung      [1-5]       [1-5]    [1-5]       [1-5]
Google       [1-5]       [1-5]    [1-5]       [1-5]
```

This is actually **multiple matrices** - one per attribute!

---

## Matrix Question Specification Format

### Format 1: Standard Single-Attribute Matrix

**When to use**: Rating multiple items on one scale.

**Questionnaire Format:**
```
[BA1] [Grid / Matrix]

For each brand you're familiar with, rate how innovative they are.

Scale Points
1  Not at all innovative
2  Slightly innovative
3  Moderately innovative
4  Very innovative
5  Extremely innovative

Rows (Dynamic from Q5 - brands selected)

[Matrix table]

[Dynamic Options from: Q5]

Notes:
• Validation: Required for all rows
```

**Key Elements:**
- **NO "Column Attributes" section** (single attribute only)
- **Scale Points section**: Lists what each column number means
- **Rows**: Specified as dynamic from another question OR listed explicitly
- **Dynamic Options badge**: Shows where row items come from

**Schema Structure:**
```typescript
{
  id: "BA1",
  type: "matrix",
  text: "For each brand you're familiar with, rate how innovative they are.",
  columns: [
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
    { id: "4", label: "4" },
    { id: "5", label: "5" }
  ],
  rows: [], // Empty if dynamic
  scalePoints: [
    "Not at all innovative",
    "Slightly innovative",
    "Moderately innovative",
    "Very innovative",
    "Extremely innovative"
  ],
  dynamicOptions: "Q5", // Row items come from Q5
  validation: { required: true }
}
```

---

### Format 2: Multi-Attribute Matrix (Complex)

**When to use**: Rating items on MULTIPLE attributes simultaneously.

**Questionnaire Format:**
```
[BA2] [Grid / Matrix]

For each brand, rate your agreement with the following statements.

Column Attributes
Innovative | Premium quality | Good value | Reliable | Trendy/Stylish | User-friendly

Scale Points
1  Strongly disagree
2  Disagree
3  Neutral
4  Agree
5  Strongly agree

Rows (Dynamic from Q5)

[Matrix table with brands as rows, attributes as column groups, scale within each]

[Dynamic Options from: Q5]

Notes:
• Validation: Required
• Each brand must be rated on all 6 attributes
```

**IMPORTANT**: This creates **6 separate sub-matrices**, one per attribute!

**Schema Structure:**
```typescript
{
  id: "BA2",
  type: "matrix-multi-attribute",
  text: "For each brand, rate your agreement with the following statements.",
  attributes: [
    "Innovative",
    "Premium quality",
    "Good value",
    "Reliable",
    "Trendy/Stylish",
    "User-friendly"
  ],
  scalePoints: [
    "Strongly disagree",
    "Disagree",
    "Neutral",
    "Agree",
    "Strongly agree"
  ],
  columns: [
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
    { id: "4", label: "4" },
    { id: "5", label: "5" }
  ],
  rows: [],
  dynamicOptions: "Q5",
  validation: { required: true }
}
```

**UI Rendering**: Create separate table for each attribute or use grouped columns.

---

## Step-by-Step Generation Process

### Step 1: Identify Matrix Type

**Look for these indicators:**

| Indicator | Type |
|-----------|------|
| **NO "Column Attributes"** section | Single-Attribute Matrix (Format 1) |
| **HAS "Column Attributes"** section with multiple attributes | Multi-Attribute Matrix (Format 2) |
| Scale Points listed as "1, 2, 3..." | Numeric scale matrix |
| Scale Points are labels (Agree/Disagree) | Labeled scale matrix |

### Step 2: Extract Scale Information

**Scale Points section defines column meanings:**

```
Scale Points
1  Label for option 1
2  Label for option 2
3  Label for option 3
...
```

**This maps to:**
- **Column headers**: 1, 2, 3, 4, 5 (or actual labels)
- **Scale explanation**: Shown above or below table

### Step 3: Extract Row Information

**Rows can be:**

1. **Explicit list** in questionnaire:
   ```
   Rows:
   - Apple
   - Samsung
   - Google
   ```

2. **Dynamic from another question**:
   ```
   [Dynamic Options from: Q5]
   ```
   Rows populated from user's response to Q5

3. **Implicit** from question text:
   ```
   "Rate the following features:"
   • Battery life
   • Camera quality
   • Screen
   ```

### Step 4: Determine if Column Attributes Exist

**If questionnaire has this section:**
```
Column Attributes
Innovative | Premium quality | Good value
```

**This means MULTIPLE matrices**, one per attribute!

**Each attribute becomes a separate rating task.**

### Step 5: Create Schema Based on Type

#### For Single-Attribute:
```typescript
{
  type: "matrix",
  columns: [...scale points as columns...],
  rows: [...items to rate...],
  scalePoints: [...scale explanations...],
  dynamicOptions: "Q5" // if applicable
}
```

#### For Multi-Attribute:
```typescript
{
  type: "matrix-multi-attribute",
  attributes: [...Column Attributes list...],
  columns: [...scale points as columns...],
  rows: [...items to rate...],
  scalePoints: [...scale explanations...]
}
```

---

## Component Rendering Specification

### Single-Attribute Matrix Display

```html
<div class="matrix-container">
  <!-- Scale Points Display (Optional but recommended) -->
  <div class="matrix-scale-points">
    <div class="scale-points-title">Scale Points</div>
    <ol>
      <li>Not at all innovative</li>
      <li>Slightly innovative</li>
      <li>Moderately innovative</li>
      <li>Very innovative</li>
      <li>Extremely innovative</li>
    </ol>
  </div>

  <!-- Matrix Table -->
  <table class="matrix-table">
    <thead>
      <tr>
        <th></th>
        <th>1</th>
        <th>2</th>
        <th>3</th>
        <th>4</th>
        <th>5</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="row-header">Apple</td>
        <td class="radio-cell"><input type="radio" name="BA1_apple" value="1"></td>
        <td class="radio-cell"><input type="radio" name="BA1_apple" value="2"></td>
        <td class="radio-cell"><input type="radio" name="BA1_apple" value="3"></td>
        <td class="radio-cell"><input type="radio" name="BA1_apple" value="4"></td>
        <td class="radio-cell"><input type="radio" name="BA1_apple" value="5"></td>
      </tr>
      <!-- More rows -->
    </tbody>
  </table>
</div>
```

### Multi-Attribute Matrix Display (Option 1: Separate Tables)

```html
<div class="matrix-multi-container">
  <!-- Scale Points (shared) -->
  <div class="matrix-scale-points">
    <div class="scale-points-title">Scale Points</div>
    <ol>
      <li>Strongly disagree</li>
      <li>Disagree</li>
      <li>Neutral</li>
      <li>Agree</li>
      <li>Strongly agree</li>
    </ol>
  </div>

  <!-- Column Attributes Display -->
  <div class="matrix-column-attributes">
    <div class="attribute-title">Rating the following attributes:</div>
    <div class="attribute-list">
      <span>Innovative</span>
      <span>Premium quality</span>
      <span>Good value</span>
      <span>Reliable</span>
      <span>Trendy/Stylish</span>
      <span>User-friendly</span>
    </div>
  </div>

  <!-- Table per Attribute -->
  <div class="attribute-matrix">
    <h4>Innovative</h4>
    <table class="matrix-table">
      <thead>
        <tr>
          <th></th>
          <th>1</th>
          <th>2</th>
          <th>3</th>
          <th>4</th>
          <th>5</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="row-header">Apple</td>
          <td class="radio-cell"><input type="radio" name="BA2_apple_innovative" value="1"></td>
          <!-- ... -->
        </tr>
      </tbody>
    </table>
  </div>

  <div class="attribute-matrix">
    <h4>Premium quality</h4>
    <table class="matrix-table">
      <!-- ... -->
    </table>
  </div>

  <!-- Repeat for each attribute -->
</div>
```

### Multi-Attribute Matrix Display (Option 2: Grouped Columns)

```html
<table class="matrix-table matrix-grouped">
  <thead>
    <tr>
      <th rowspan="2"></th>
      <th colspan="5">Innovative</th>
      <th colspan="5">Premium quality</th>
      <th colspan="5">Good value</th>
    </tr>
    <tr>
      <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
      <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
      <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="row-header">Apple</td>
      <td class="radio-cell"><input type="radio" name="BA2_apple_attr1" value="1"></td>
      <!-- 5 columns for attribute 1 -->
      <td class="radio-cell"><input type="radio" name="BA2_apple_attr2" value="1"></td>
      <!-- 5 columns for attribute 2 -->
      <!-- ... -->
    </tr>
  </tbody>
</table>
```

---

## Common Parsing Mistakes & Solutions

### Mistake 1: Confusing Column Attributes with Table Columns

**Problem**: Treating each "Column Attribute" as a table column header.

**Wrong Schema:**
```typescript
columns: [
  { id: "innovative", label: "Innovative" },
  { id: "premium", label: "Premium quality" }
]
```

**Correct Schema:**
```typescript
attributes: ["Innovative", "Premium quality"], // Separate property!
columns: [
  { id: "1", label: "1" },
  { id: "2", label: "2" },
  // ... scale points as columns
]
```

### Mistake 2: Ignoring Scale Points Section

**Problem**: Not displaying scale point explanations.

**Solution**: Always include Scale Points section above table:
```html
<div class="matrix-scale-points">
  <div>Scale Points</div>
  <ol>
    <li>Label 1</li>
    <li>Label 2</li>
    <!-- ... -->
  </ol>
</div>
```

### Mistake 3: Not Handling Dynamic Options

**Problem**: Trying to hardcode rows when `[Dynamic Options from: Q5]` is specified.

**Solution**:
```typescript
{
  rows: [], // Leave empty in schema
  dynamicOptions: "Q5", // Will populate at runtime
  dynamicOptionsMetadata: {
    sourceQuestion: "Q5",
    sourceField: "response" // or "label" for display text
  }
}
```

### Mistake 4: Missing Validation for All Rows

**Problem**: Not requiring responses for all matrix rows, allowing respondents to skip items.

**Why This Matters**:
- Incomplete data leads to biased analysis
- Selective answering skews results (respondents skip items they're unsure about)
- Makes cross-item comparisons impossible
- Violates standard market research practices

**Understanding Two-Level Validation:**

**Level 1 - Question-Level (`required`):**
```typescript
validation: {
  required: true  // Makes ENTIRE matrix mandatory (can't skip question)
}
```

**Level 2 - Row-Level (`requireAllRows`):**
```typescript
validation: {
  required: true,           // Level 1: Must answer matrix
  requireAllRows: true      // Level 2: Must answer EVERY row
}
```

**Decision Guide:**
| required | requireAllRows | Result |
|----------|---------------|--------|
| true | true | Must answer matrix AND all rows (RECOMMENDED) |
| true | false | Must answer matrix but can skip some rows |
| false | * | Can skip entire matrix (rare) |

**Exception**: Only set `requireAllRows: false` if:
- Questionnaire explicitly states "optional" or "if applicable"
- Some rows genuinely may not apply to all respondents
- There's a "Not Applicable" or "Don't Know" column option

**DEFAULT RULE**: Always use BOTH `required: true` AND `requireAllRows: true` unless questionnaire says otherwise

### Mistake 5: Wrong Input Type (Checkbox vs Radio)

**Problem**: Using checkboxes when only one selection per row is allowed.

**Solution**:
- **Single choice per row**: Use `type="radio"` with unique name per row
- **Multiple choice per row**: Use `type="checkbox"` with name per row

```html
<!-- Single choice (most common) -->
<input type="radio" name="BA1_apple" value="1">

<!-- Multiple choice per row -->
<input type="checkbox" name="BA1_apple_1" value="1">
<input type="checkbox" name="BA1_apple_2" value="2">
```

---

## Validation Checklist for Matrix Questions

Before marking matrix generation as complete, verify:

### Structure
- [ ] Identified correct matrix type (single-attribute vs multi-attribute)
- [ ] Scale Points section extracted correctly
- [ ] Rows identified (explicit list or dynamic source)
- [ ] Column Attributes section handled correctly (if present)

### Schema
- [ ] `type` field set correctly (`"matrix"` or `"matrix-multi-attribute"`)
- [ ] `columns` array contains scale point values
- [ ] `scalePoints` array contains scale explanations
- [ ] `rows` array populated OR `dynamicOptions` specified
- [ ] `attributes` array populated (if multi-attribute)
- [ ] `validation` rules specified

### Display
- [ ] Scale Points section visible above table
- [ ] Column Attributes section visible (if applicable)
- [ ] Table renders with correct number of rows and columns
- [ ] Radio buttons (or checkboxes) render in cells
- [ ] Row headers display correctly
- [ ] Column headers display correctly
- [ ] Styling matches theme specification

### Logic & Metadata
- [ ] Dynamic options badge present (if applicable)
- [ ] Navigation badges present
- [ ] Validation notes present
- [ ] All metadata badges correctly styled

---

## Referencing Matrix Responses in Logic

Matrix responses are stored as nested objects:

```typescript
responses['Q5'] = {
  'row1': 'col_a',
  'row2': 'col_b'
}
```

### In Termination/Skip Logic

Use **dot notation** to reference specific rows:

```typescript
{
  action: 'terminate',
  when: {
    operator: 'eq',
    left: 'Q5.row1',    // DOT notation - NOT 'Q5_row1'
    right: 'col_a'
  }
}
```

### In Show/Hide Conditions

```typescript
showCondition: "Q5.row1 === 'col_a' && Q5.row2 !== 'col_b'"
```

### As Loop Source

Matrix questions can be loop sources. Loop iterates through answered row IDs:

```typescript
{
  metadata: {
    loopSourceQuestion: 'Q5'  // Loops through answered rows (row1, row2, ...)
  }
}
```

### As Dynamic Row Source

Generate matrix rows from another matrix's answered rows:

```typescript
{
  metadata: {
    pipeRowsFrom: {
      sourceQuestionId: 'Q5',
      generateFrom: 'answered_rows'  // Creates rows from Q5's answered rows
    }
  }
}
```

---

### Responsiveness
- [ ] Table scrolls horizontally on mobile
- [ ] Touch targets minimum 44x44px
- [ ] Text remains readable at all breakpoints

---

## Quick Reference: Matrix Decision Tree

```
START: Is this a matrix question?
│
├─ Does it have "Column Attributes" section with multiple attributes?
│  │
│  YES → Multi-Attribute Matrix (Format 2)
│  │     - Create attributes array
│  │     - Render separate table per attribute OR grouped columns
│  │
│  NO → Single-Attribute Matrix (Format 1)
│        - Standard matrix with rows x columns
│
├─ How are rows defined?
│  │
│  ├─ Explicit list → Add to rows array
│  ├─ Dynamic from Q# → Set dynamicOptions: "Q#", rows: []
│  └─ Implicit in text → Extract and add to rows array
│
├─ How are columns defined?
│  │
│  └─ From "Scale Points" section → Each number/label becomes column
│     - 1, 2, 3, 4, 5 → columns with ids and labels
│
└─ What goes in each cell?
   │
   ├─ Single choice → Radio buttons (most common)
   └─ Multiple choice → Checkboxes (rare)
```

---

## Example Conversions

### Example 1: Simple Brand Rating

**Questionnaire:**
```
[BA1] [Grid / Matrix]

How familiar are you with the following brands?

Scale Points
1  Never heard of
2  Heard of but never used
3  Have used occasionally
4  Use regularly
5  It's my primary brand

Rows:
- Apple
- Samsung
- Google
- OnePlus

[Default → BA2]
```

**Schema:**
```typescript
{
  id: "BA1",
  type: "matrix",
  text: "How familiar are you with the following brands?",
  columns: [
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
    { id: "4", label: "4" },
    { id: "5", label: "5" }
  ],
  rows: [
    { id: "apple", label: "Apple" },
    { id: "samsung", label: "Samsung" },
    { id: "google", label: "Google" },
    { id: "oneplus", label: "OnePlus" }
  ],
  scalePoints: [
    "Never heard of",
    "Heard of but never used",
    "Have used occasionally",
    "Use regularly",
    "It's my primary brand"
  ],
  validation: { required: true },
  navigation: { default: "BA2" }
}
```

### Example 2: Dynamic Rows with Multi-Attribute

**Questionnaire:**
```
[BA5] [Grid / Matrix]

For each brand you selected, rate your agreement with the following statements.

Column Attributes
Offers good value for money | Has innovative products | Provides excellent customer service

Scale Points
1  Strongly disagree
2  Disagree
3  Neutral
4  Agree
5  Strongly agree

[Dynamic Options from: Q3]

Notes:
• Must rate all selected brands on all attributes
```

**Schema:**
```typescript
{
  id: "BA5",
  type: "matrix-multi-attribute",
  text: "For each brand you selected, rate your agreement with the following statements.",
  attributes: [
    "Offers good value for money",
    "Has innovative products",
    "Provides excellent customer service"
  ],
  columns: [
    { id: "1", label: "1" },
    { id: "2", label: "2" },
    { id: "3", label: "3" },
    { id: "4", label: "4" },
    { id: "5", label: "5" }
  ],
  rows: [],
  scalePoints: [
    "Strongly disagree",
    "Disagree",
    "Neutral",
    "Agree",
    "Strongly agree"
  ],
  dynamicOptions: "Q3",
  validation: {
    required: true,
    requireAllRows: true,
    requireAllAttributes: true
  }
}
```

---

## Troubleshooting Guide

### Issue: Matrix not rendering

**Check:**
1. Does schema have `type: "matrix"`?
2. Are `columns` and `rows` arrays populated?
3. Is `scalePoints` array present?
4. Are column and row IDs unique?

### Issue: Scale points not showing

**Check:**
1. Is `scalePoints` array in schema?
2. Does component render the scale points section?
3. Is CSS styling hiding the section?

### Issue: Dynamic rows not populating

**Check:**
1. Is `dynamicOptions` field set to correct question ID?
2. Does source question (Q#) have responses?
3. Is runtime logic evaluating dynamicOptions correctly?

### Issue: Radio buttons allowing multiple selections per row

**Check:**
1. Each row must have unique `name` attribute:
   ```html
   <input type="radio" name="BA1_row1" value="1">
   <input type="radio" name="BA1_row1" value="2">
   ```
2. Name format: `{questionId}_{rowId}`

### Issue: Multi-attribute matrix showing as single table

**Check:**
1. Is `type` set to `"matrix-multi-attribute"`?
2. Is `attributes` array present in schema?
3. Does component support multi-attribute rendering?

---

## Best Practices

1. **Always include Scale Points section** - Even if labels are short (1-5), include explanations
2. **Use dynamic options when possible** - Reduces duplication and maintains consistency
3. **Validate all rows** - Require responses for every row unless explicitly optional
4. **Keep attributes focused** - Don't exceed 6 attributes in multi-attribute matrices
5. **Test responsive behavior** - Matrix tables must scroll horizontally on mobile
6. **Use semantic HTML** - Proper table structure with thead, tbody, th, td
7. **Maintain accessibility** - Labels for all inputs, keyboard navigation support

---

## Related Documentation

- **survey-question-types.md**: General question type definitions
- **survey-components-spec.md**: MatrixGrid component specification (lines 480-662)
- **survey-ui-theme.md**: Styling specifications for matrix tables

---

**Remember**: When in doubt, use Format 1 (Single-Attribute Matrix). It covers 80% of matrix use cases and is simpler to implement and debug.

---

## Multi Grid / 3D Grid Questions

### When to Use Multi Grid Instead of Standard Matrix

Use `type: "multi_grid"` when:
- Respondents can select MULTIPLE columns per row (not just one)
- You need "Other (specify)" rows that are optional
- You need "Don't know" / "None" / "None of the above" / "Not applicable" / "Don't know" exclusive rows that clear other selections

### Multi Grid Schema

```typescript
{
  id: "MG1",
  type: "multi_grid",
  text: "For each brand, select all features that apply.",
  required: true,
  matrixRows: [
    { id: "brand_a", label: "Brand A" },
    { id: "brand_b", label: "Brand B" },
    { id: "other", label: "Other (please specify)" },
    { id: "dont_know", label: "Don't know" }
    { id: "none", label: "None" }
    { id: "none_of_the_above", label: "None of the above" },
    { id: "not_applicable", label: "Not Applicable" },
    { id: "dont_know", label: "Don't know"}
  ],
  matrixColumns: [
    { id: "fast", label: "Fast", value: "fast" },
    { id: "reliable", label: "Reliable", value: "reliable" },
    { id: "cheap", label: "Affordable", value: "cheap" }
  ],
  metadata: {
    selectionMode: "multiple",
    otherRowIds: ["other"],
    exclusiveRowIds: ["dont_know", "none", "none_of_the_above", "na", "not_applicable"],
    maxPerColumn: 5
  }
}
```

### Key Metadata Properties

| Property | Purpose | Example |
|----------|---------|---------|
| `selectionMode` | Single or multi-select per row | `"multiple"` |
| `otherRowIds` | Rows that are optional (skip validation) | `["other", "other_specify"]` |
| `exclusiveRowIds` | Rows that deselect all others when selected | `["dont_know", "none"]` |
| `columnExclusiveOptions` | Columns that deselect other columns in row | `["none", "na"]` |
| `maxPerColumn` | Max selections per row | `3` |

### Other Row Behavior

Rows listed in `otherRowIds`:
- Are OPTIONAL - validation does not require them to be answered
- If answered, response is captured normally
- Useful for "Other (please specify)" where user may or may not have input

```typescript
metadata: {
  otherRowIds: ["other_row_id"]
}
```

### Exclusive Row Behavior

Rows listed in `exclusiveRowIds`:
- Selecting clears ALL other row selections
- Selecting any non-exclusive row clears exclusive rows
- Validation passes if exclusive row is selected (only need that row)

```typescript
metadata: {
  exclusiveRowIds: ["dont_know", "none_of_above", "na", "none"]
}
```

**User Flow Example**:
1. User selects: Brand A → Fast, Brand B → Reliable
2. User clicks: "Don't know" → any column
3. Result: Only "Don't know" has selection, Brand A and B cleared
4. User clicks: Brand A → Fast
5. Result: "Don't know" cleared, only Brand A → Fast remains

### Validation Rules

```typescript
// Standard validation - all non-other rows required
metadata: { requireAllRows: true }

// With other rows - other rows optional
metadata: {
  requireAllRows: true,
  otherRowIds: ["other"]
}
// Result: All rows except "other" must be answered

// With exclusive rows - if exclusive selected, validation passes
metadata: {
  requireAllRows: true,
  exclusiveRowIds: ["dont_know"]
}
// Result: If "dont_know" selected, no other rows required
```

### Decision: Matrix vs Multi Grid

| Scenario | Use |
|----------|-----|
| Single selection per row (radio buttons) | `type: "matrix"` |
| Multiple selections per row (checkboxes) | `type: "multi_grid"` |
| Need "Other" optional rows | `type: "multi_grid"` |
| Need "Don't know" exclusive behavior | `type: "multi_grid"` |
| Simple rating scale | `type: "matrix"` |
