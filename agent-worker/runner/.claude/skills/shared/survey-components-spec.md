# Survey Components Specification

This document defines the exact component specifications for all UI elements used in survey generation.

**Reference**: Works with `survey-ui-theme.md` and `survey-structure-spec.md`

---

## Component Library

### 1. Badge Component

Badges are used for question IDs, question types, logic indicators, and metadata.

#### 1.1 Question ID Badge
```tsx
<Badge variant="question-id">
  {questionId}
</Badge>
```

**Props**:
- `variant`: "question-id"
- `children`: Question ID text (e.g., "INTRO1", "SCR1", "Q1")

**Styling**:
```css
.badge-question-id {
  display: inline-block;
  background-color: #3D1C35;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  margin-right: 8px;
}
```

#### 1.2 Question Type Badge
```tsx
<Badge variant="question-type">
  {questionType}
</Badge>
```

**Props**:
- `variant`: "question-type"
- `children`: Question type text (e.g., "Single Choice", "Grid / Matrix")

**Styling**:
```css
.badge-question-type {
  display: inline-block;
  background-color: #F5F5F5;
  color: #666666;
  font-size: 11px;
  font-weight: 400;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 12px;
}
```

#### 1.3 Logic Badge (Default)
```tsx
<Badge variant="logic-default" icon="arrow">
  Default → {targetId}
</Badge>
```

**Styling**:
```css
.badge-logic-default {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #3D1C35;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
}
```

#### 1.4 Logic Badge (Conditional)
```tsx
<Badge variant="logic-conditional">
  IF {condition} → {targetId}
</Badge>
```

**Styling**:
```css
.badge-logic-conditional {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #3D1C35;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
}
```

#### 1.5 Randomization Badge
```tsx
<Badge variant="randomized" icon="shuffle">
  Randomized (anchored: {anchoredItems})
</Badge>
```

**Styling**:
```css
.badge-randomized {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #3D1C35;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
}
```

#### 1.6 Show Condition Badge
```tsx
<Badge variant="show-condition" icon="eye">
  Show Condition: {condition}
</Badge>
```

**Styling**:
```css
.badge-show-condition {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #FFFFFF;
  border: 1px solid #FF9800;
  color: #FF9800;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
}
```

#### 1.7 Dynamic Options Badge
```tsx
<Badge variant="dynamic-options" icon="link">
  Dynamic Options from: {sourceId}
</Badge>
```

**Styling**:
```css
.badge-dynamic-options {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: E0BFD8;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
}
```

---

### 2. Radio Button Component

Used for single-choice questions.

```tsx
<RadioButton
  name={questionId}
  value={optionValue}
  label={optionLabel}
  checked={isChecked}
  onChange={handleChange}
/>
```

**Props**:
- `name`: Question ID (for grouping)
- `value`: Option value
- `label`: Option text
- `checked`: Boolean
- `onChange`: Handler function

**Styling**:
```css
.radio-button-container {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.radio-button-input {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #BDBDBD;
  border-radius: 50%;
  margin-right: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;
}

.radio-button-input:hover {
  border-color: #999999;
}

.radio-button-input:checked {
  border-color: #1A1A1A;
  background-color: #1A1A1A;
}

.radio-button-input:checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #FFFFFF;
}

.radio-button-input:focus {
  outline: 2px solid #3D1C35;
  outline-offset: 2px;
}

.radio-button-label {
  font-size: 14px;
  font-weight: 400;
  color: #1A1A1A;
  cursor: pointer;
  user-select: none;
}
```

---

### 3. Checkbox Component

Used for multiple-choice questions.

```tsx
<Checkbox
  name={questionId}
  value={optionValue}
  label={optionLabel}
  checked={isChecked}
  onChange={handleChange}
/>
```

**Props**:
- `name`: Question ID
- `value`: Option value
- `label`: Option text
- `checked`: Boolean
- `onChange`: Handler function

**Styling**:
```css
.checkbox-container {
  display: flex;
  align-items: center;
  padding: 8px 0;
  cursor: pointer;
}

.checkbox-input {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #BDBDBD;
  border-radius: 3px;
  margin-right: 12px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease-in-out;
}

.checkbox-input:hover {
  border-color: #999999;
}

.checkbox-input:checked {
  border-color: #1A1A1A;
  background-color: #1A1A1A;
}

.checkbox-input:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 700;
}

.checkbox-input:focus {
  outline: 2px solid #3D1C35;
  outline-offset: 2px;
}

.checkbox-label {
  font-size: 14px;
  font-weight: 400;
  color: #1A1A1A;
  cursor: pointer;
  user-select: none;
}
```

---

### 4. Text Input Component

Used for open-ended text questions.

```tsx
<TextInput
  id={questionId}
  placeholder={placeholderText}
  value={value}
  onChange={handleChange}
  multiline={isMultiline}
  rows={rowCount}
/>
```

**Props**:
- `id`: Question ID
- `placeholder`: Placeholder text
- `value`: Current value
- `onChange`: Handler function
- `multiline`: Boolean (single line vs textarea)
- `rows`: Number of rows for textarea

**Styling**:
```css
.text-input,
.text-area {
  width: 100%;
  border: 1px solid #BDBDBD;
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 400;
  font-family: inherit;
  color: #1A1A1A;
  transition: all 0.2s ease-in-out;
}

.text-input {
  min-height: 44px;
}

.text-area {
  min-height: 120px;
  resize: vertical;
}

.text-input:hover,
.text-area:hover {
  border-color: #999999;
}

.text-input:focus,
.text-area:focus {
  outline: none;
  border-color: #3D1C35;
  box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.1);
}

.text-input::placeholder,
.text-area::placeholder {
  color: #BDBDBD;
}
```

---

### 5. Dropdown Component

Used for select questions.

```tsx
<Dropdown
  id={questionId}
  options={optionsList}
  value={selectedValue}
  onChange={handleChange}
  placeholder={placeholderText}
/>
```

**Props**:
- `id`: Question ID
- `options`: Array of {value, label} objects
- `value`: Selected value
- `onChange`: Handler function
- `placeholder`: Placeholder text

**Styling**:
```css
.dropdown-container {
  position: relative;
  width: 100%;
}

.dropdown-select {
  width: 100%;
  border: 1px solid #BDBDBD;
  border-radius: 6px;
  padding: 10px 36px 10px 12px;
  font-size: 14px;
  font-weight: 400;
  font-family: inherit;
  color: #1A1A1A;
  background-color: #FFFFFF;
  cursor: pointer;
  appearance: none;
  transition: all 0.2s ease-in-out;
}

.dropdown-select:hover {
  border-color: #999999;
}

.dropdown-select:focus {
  outline: none;
  border-color: #3D1C35;
  box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.1);
}

.dropdown-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #666666;
  pointer-events: none;
}

.dropdown-select:focus + .dropdown-icon {
  transform: translateY(-50%) rotate(180deg);
}
```

---

### 6. Matrix/Grid Component

Used for matrix questions with rows and columns.

```tsx
<MatrixGrid
  questionId={questionId}
  rows={rowsList}
  columns={columnsList}
  values={selectedValues}
  onChange={handleChange}
  type="radio" // or "checkbox"
/>
```

**Props**:
- `questionId`: Question ID
- `rows`: Array of row objects {id, label}
- `columns`: Array of column objects {id, label}
- `values`: Object mapping row IDs to selected column IDs
- `onChange`: Handler function
- `type`: "radio" or "checkbox"

**Structure**:
```html
<div class="matrix-container">
  <div class="matrix-header">
    <div class="matrix-column-attributes">
      Column Attributes
      <div class="attribute-list">
        <span>Attribute 1</span>
        <span>Attribute 2</span>
        ...
      </div>
    </div>
    <div class="matrix-scale-points">
      Scale Points
      <ol>
        <li>Scale point 1</li>
        <li>Scale point 2</li>
        ...
      </ol>
    </div>
  </div>
  
  <table class="matrix-table">
    <thead>
      <tr>
        <th></th>
        <th>Column 1</th>
        <th>Column 2</th>
        ...
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="row-header">Row 1</td>
        <td class="radio-cell">○</td>
        <td class="radio-cell">○</td>
        ...
      </tr>
      ...
    </tbody>
  </table>
</div>
```

**Styling**:
```css
.matrix-container {
  width: 100%;
  overflow-x: auto;
}

.matrix-header {
  margin-bottom: 16px;
}

.matrix-column-attributes {
  margin-bottom: 12px;
}

.matrix-column-attributes > div:first-child {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.attribute-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.attribute-list span {
  font-size: 13px;
  font-weight: 600;
  color: #666666;
}

.matrix-scale-points > div:first-child {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.matrix-scale-points ol {
  list-style: decimal;
  padding-left: 20px;
}

.matrix-scale-points li {
  font-size: 14px;
  font-weight: 400;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  overflow: hidden;
}

.matrix-table thead {
  background-color: #F5F5F5;
}

.matrix-table th {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  text-align: center;
  padding: 12px 8px;
  border-bottom: 2px solid #BDBDBD;
}

.matrix-table th:first-child {
  text-align: left;
  min-width: 200px;
}

.matrix-table tbody tr {
  background-color: #FFFFFF;
}

.matrix-table tbody tr:nth-child(even) {
  background-color: #FAFAFA;
}

.matrix-table td {
  padding: 12px 8px;
  border-bottom: 1px solid #E0E0E0;
}

.matrix-table tbody tr:last-child td {
  border-bottom: none;
}

.matrix-table .row-header {
  font-size: 14px;
  font-weight: 400;
  color: #1A1A1A;
  text-align: left;
  padding-left: 16px;
}

.matrix-table .radio-cell {
  text-align: center;
  vertical-align: middle;
}

.matrix-table .radio-cell input[type="radio"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}
```

---

### 7. Section Header Component

Collapsible section header with question count.

```tsx
<SectionHeader
  sectionNumber={sectionNumber}
  sectionName={sectionName}
  description={description}
  questionCount={questionCount}
  isExpanded={isExpanded}
  onToggle={handleToggle}
/>
```

**Props**:
- `sectionNumber`: Section number (1, 2, 3, etc.)
- `sectionName`: Section name
- `description`: Optional description
- `questionCount`: Number of questions
- `isExpanded`: Boolean
- `onToggle`: Handler function

**Styling**:
```css
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 16px 24px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  user-select: none;
}

.section-header:hover {
  background-color: #F9F9F9;
}

.section-header-left {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.section-header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.section-header-description {
  font-size: 14px;
  font-weight: 400;
  color: #666666;
}

.section-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-question-count {
  font-size: 14px;
  font-weight: 400;
  color: #666666;
}

.section-chevron {
  width: 16px;
  height: 16px;
  color: #666666;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.section-chevron.expanded {
  transform: rotate(180deg);
}
```

---

### 8. Section Content Component

Container for section questions.

```tsx
<SectionContent isExpanded={isExpanded}>
  {questions.map(question => (
    <QuestionComponent key={question.id} {...question} />
  ))}
</SectionContent>
```

**Props**:
- `isExpanded`: Boolean
- `children`: Question components

**Styling**:
```css
.section-content {
  background-color: #FAFAFA;
  border: 1px solid #E0E0E0;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 24px;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.section-content.collapsed {
  max-height: 0;
  padding: 0 24px;
  border: none;
}

.section-content.expanded {
  max-height: 10000px; /* Large enough value */
}
```

---

### 9. Question Container Component

Container for individual questions.

```tsx
<QuestionContainer>
  <QuestionHeader {...headerProps} />
  <QuestionBody {...bodyProps} />
  <QuestionMetadata {...metadataProps} />
  <QuestionNotes {...notesProps} />
</QuestionContainer>
```

**Styling**:
```css
.question-container {
  background-color: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.question-container:last-child {
  margin-bottom: 0;
}
```

---

### 10. Question Header Component

Header section of a question with badges and text.

```tsx
<QuestionHeader
  questionId={questionId}
  questionType={questionType}
  questionText={questionText}
/>
```

**Styling**:
```css
.question-header {
  margin-bottom: 16px;
}

.question-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.question-text {
  font-size: 15px;
  font-weight: 400;
  color: #1A1A1A;
  line-height: 1.6;
}
```

---

### 11. Question Metadata Component

Metadata row with logic badges.

```tsx
<QuestionMetadata
  defaultTarget={defaultTarget}
  conditionalLogic={conditionalLogic}
  randomization={randomization}
  showCondition={showCondition}
  dynamicOptions={dynamicOptions}
/>
```

**Styling**:
```css
.question-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
```

---

### 12. Question Notes Component

Notes section for additional information.

```tsx
<QuestionNotes notes={notesList} />
```

**Props**:
- `notes`: Array of note strings

**Styling**:
```css
.question-notes {
  background-color: #E0BFD8;
  border-left: 4px solid #3D1C35;
  padding: 16px;
  border-radius: 4px;
  margin-top: 16px;
}

.question-notes-label {
  font-size: 13px;
  font-weight: 700;
  color: #333333;
  margin-bottom: 8px;
}

.question-notes-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.question-notes-list li {
  font-size: 13px;
  font-weight: 400;
  color: #333333;
  line-height: 1.6;
  margin-bottom: 4px;
}

.question-notes-list li:last-child {
  margin-bottom: 0;
}
```

---

### 13. Page Header Component

Survey title, objectives, and audience information.

```tsx
<PageHeader
  title={surveyTitle}
  objectives={objectivesList}
  audience={audienceData}
/>
```

**Styling**:
```css
.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
  margin-bottom: 32px;
}

.page-section {
  margin-bottom: 24px;
}

.page-section:last-child {
  margin-bottom: 32px;
}

.page-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 12px;
}

.page-section-list {
  list-style: disc;
  padding-left: 20px;
  margin: 0;
}

.page-section-list li {
  font-size: 14px;
  font-weight: 400;
  color: #666666;
  line-height: 1.5;
  margin-bottom: 6px;
}

.page-section-list li:last-child {
  margin-bottom: 0;
}
```

---

## Component Usage Guidelines

### 1. Consistency Rules
- **Always use the same component** for the same question type
- **Never mix styling approaches** (e.g., inline styles vs classes)
- **Maintain spacing** as specified in theme documentation
- **Use semantic HTML** where appropriate

### 2. Accessibility Requirements
- **All interactive elements** must be keyboard accessible
- **All form inputs** must have associated labels
- **Focus states** must be clearly visible
- **ARIA attributes** must be used for complex components
- **Color contrast** must meet WCAG 2.1 AA standards

### 3. Responsive Behavior
- **Touch targets** minimum 44x44px on mobile
- **Text** must be readable at all breakpoints
- **Tables** must scroll horizontally on small screens
- **Spacing** may be reduced on mobile but maintain hierarchy

### 4. Performance Considerations
- **Lazy load** sections that are collapsed
- **Virtualize** long lists of options (>50 items)
- **Debounce** text input handlers
- **Memoize** complex calculations

---

## Component Composition Examples

### Example 1: Single Choice Question
```tsx
<QuestionContainer>
  <QuestionHeader
    questionId="SCR1"
    questionType="Single Choice"
    questionText="What is your age?"
  />
  <div className="question-options">
    <RadioButton name="SCR1" value="1" label="Under 18" />
    <RadioButton name="SCR1" value="2" label="18-24" />
    <RadioButton name="SCR1" value="3" label="25-34" />
    <RadioButton name="SCR1" value="4" label="35-44" />
    <RadioButton name="SCR1" value="5" label="45-55" />
    <RadioButton name="SCR1" value="6" label="56-64" />
    <RadioButton name="SCR1" value="7" label="65 or older" />
  </div>
  <QuestionMetadata
    defaultTarget="SCR2"
    conditionalLogic={[
      { condition: "response = [1, 6, 7]", target: "TERM1" }
    ]}
    showCondition="BA3 != 99"
  />
  <QuestionNotes
    notes={[
      "Validation: Required",
      "Research Note: Brand attribute associations - key for positioning analysis"
    ]}
  />
</QuestionContainer>
```

### Example 2: Matrix Question
```tsx
<QuestionContainer>
  <QuestionHeader
    questionId="SCR1"
    questionType="Grid / Matrix"
    questionText="For each brand you're familiar with, please indicate how strongly you associate them with the following characteristics."
  />
  <MatrixGrid
    questionId="SCR1"
    columns={[
      { id: "1", label: "Innovative" },
      { id: "2", label: "Premium quality" },
      { id: "3", label: "Good value" },
      { id: "4", label: "Reliable" },
      { id: "5", label: "Trendy/Stylish" },
      { id: "6", label: "User-friendly" }
    ]}
    rows={[
      { id: "1", label: "Not at all associated" },
      { id: "2", label: "Slightly associated" },
      { id: "3", label: "Moderately associated" },
      { id: "4", label: "Strongly associated" },
      { id: "5", label: "Very strongly associated" }
    ]}
    type="radio"
  />
  <QuestionMetadata
    dynamicOptions="BA4"
  />
</QuestionContainer>
```

### Example 3: Introduction Screen
```tsx
<QuestionContainer>
  <QuestionHeader
    questionId="INTRO1"
    questionType="Introduction Screen"
    questionText="Thank you for participating in this research study about smartphones and mobile devices. Your opinions are valuable and will help us understand consumer preferences better. This survey will take approximately 12-15 minutes to complete. All responses are anonymous and confidential. Please answer honestly based on your personal opinions and experiences."
  />
  <QuestionMetadata
    defaultTarget="SCR1"
  />
</QuestionContainer>
```

---

## Related Documentation

- **Theme Details**: See `survey-ui-theme.md`
- **Structure Specifications**: See `survey-structure-spec.md`
- **Logic & Routing**: See `survey-logic-spec.md`
- **Question Types**: See `survey-question-types.md`

