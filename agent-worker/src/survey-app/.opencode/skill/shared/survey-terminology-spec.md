# Survey Terminology Specification

This document defines the language and terminology standards that MUST be used in all survey interfaces to ensure professional communication with research managers and stakeholders.

---

## Core Principle

**CRITICAL**: All user-facing labels, badges, descriptions, and messages MUST use professional research manager terminology. NEVER expose technical implementation details, code logic terms, or developer jargon.

---

## Approved Research Terminology

Use these professional terms in survey interfaces:

### Data Quality & Validation
- **Data Quality** - NOT "Skip Logic Check" or "Validation Check"
- **Response Quality** - NOT "Answer Validation" or "Input Check"
- **Data Validation** - NOT "Logic Check" or "Conditional Validation"
- **Quality Assurance** - NOT "Error Detection" or "Bug Check"

### Open-Ended Responses
- **Open-End Quality** - NOT "OE Gibberish Text" or "Text Validation"
- **Text Response Quality** - NOT "String Validation" or "Text Check"
- **Response Clarity** - NOT "Gibberish Detection"

### Response Patterns
- **Straight-Lining Detection** - NOT "Straight Liners" or "Same Answer Check"
- **Response Patterns** - NOT "Pattern Detection" or "Response Logic"
- **Response Consistency** - NOT "Consistency Check"

### Completion Behavior
- **Completion Speed Validation** - NOT "Speeders" or "Fast Responders"
- **Survey Duration** - NOT "Time Variable" or "Timer Function"
- **Response Time** - NOT "Timestamp Delta"

### Sample Management
- **Sample Distribution** - NOT "Quota Logic" or "Sample Rules"
- **Quota Management** - NOT "Quota Algorithm"
- **Target Achievement** - NOT "Goal Variable"
- **Sample Goals** - NOT "Quota Target"

### Survey Flow
- **Survey Flow** - NOT "Skip Logic" or "Branching Logic"
- **Response Routing** - NOT "Conditional Navigation"
- **Question Flow** - NOT "Navigation Logic"
- **Display Conditions** - NOT "Show/Hide Logic"

---

## Forbidden Technical Terms

NEVER use these developer/technical terms in user-facing interfaces:

### Programming Concepts
- ❌ **"Skip Logic"** → Use "Survey Flow" or "Response Routing"
- ❌ **"Code Logic"** → Use "Survey Logic" or "Conditional Display"
- ❌ **"Boolean"** → Use "Yes/No" or "True/False"
- ❌ **"Variable"** → Use "Question Response" or "Answer"
- ❌ **"Function"** → Use "Calculation" or "Formula"
- ❌ **"Array"** → Use "List" or "Collection"
- ❌ **"String"** → Use "Text" or "Response"
- ❌ **"Integer"** → Use "Number" or "Numeric Value"

### Development Terms
- ❌ **"Debug Mode"** → Use "Testing Mode" or "Preview Mode"
- ❌ **"API"** → Use "Integration" or "Connection"
- ❌ **"Database"** → Use "Response Storage" or "Data Repository"
- ❌ **"Query"** → Use "Search" or "Filter"
- ❌ **"Endpoint"** → Use "Connection Point" or "Integration"
- ❌ **"Payload"** → Use "Data" or "Information"

### UI/Technical Elements
- ❌ **"Radio Button"** → Use "Single Selection" or "Choose One"
- ❌ **"Checkbox"** → Use "Multiple Selection" or "Select All That Apply"
- ❌ **"Text Input"** → Use "Open-Ended" or "Text Response"
- ❌ **"Dropdown"** → Use "Selection List" or "Menu"
- ❌ **"Progress Bar"** → Use "Progress Indicator" or "Completion Status"

---

## Professional Labels by Category

### Data Quality Checks

**Use:**
- "Data Quality"
- "Response Quality"
- "Validation Status"
- "Quality Metrics"

**NOT:**
- "Error Check"
- "Bug Detection"
- "Code Validation"
- "Logic Test"

### Survey Logic

**Use:**
- "Display Conditions"
- "Response Routing"
- "Question Flow"
- "Survey Navigation"
- "Conditional Display"

**NOT:**
- "If/Then Logic"
- "Conditional Code"
- "Logic Functions"
- "Skip Logic"
- "Branching Code"

### Question Types

**Use:**
- "Rating Scale"
- "Multiple Selection"
- "Single Selection"
- "Open-Ended"
- "Matrix Grid"
- "Ranking"

**NOT:**
- "Radio Button"
- "Checkbox"
- "Text Input"
- "Dropdown"
- "Grid Component"
- "Drag and Drop"

### Progress Indicators

**Use:**
- "Completion Progress"
- "Sample Goals"
- "Target Achievement"
- "Response Rate"
- "Collection Status"

**NOT:**
- "Progress Bar"
- "Count Variable"
- "Total Check"
- "Percentage Calculation"
- "Completion Function"

### Data Collection

**Use:**
- "Response Collection"
- "Data Capture"
- "Answer Recording"
- "Response Submission"

**NOT:**
- "Data Push"
- "POST Request"
- "Database Insert"
- "API Call"

---

## Implementation Rules

### 1. All Visible Labels
Every label, heading, badge, and button text must use research terminology.

**Good:**
```
- "Data Quality Checks"
- "Sample Progress"
- "Response Routing"
```

**Bad:**
```
- "Skip Logic Validation"
- "Quota Algorithm Status"
- "If/Then Conditions"
```

### 2. Error Messages
Frame all errors in research context, not technical context.

**Good:**
```
- "This question requires a response before continuing"
- "Response does not meet quality standards"
- "Sample quota has been reached"
```

**Bad:**
```
- "Validation function returned false"
- "String length < minLength"
- "Quota variable exceeded"
```

### 3. Help Text & Tooltips
Explain features using research concepts, not code concepts.

**Good:**
```
- "Display conditions control when respondents see this question"
- "Quota management ensures balanced sample distribution"
- "Response routing directs respondents based on their answers"
```

**Bad:**
```
- "Skip logic evaluates boolean expressions to show/hide"
- "Quota logic checks if count < target"
- "Navigation function determines next question ID"
```

### 4. Reports & Exports
Use professional research language in all reports, dashboards, and exports.

**Good:**
```
- "Data Quality Summary"
- "Sample Composition"
- "Response Distribution"
- "Completion Metrics"
```

**Bad:**
```
- "Validation Function Results"
- "Database Record Count"
- "Response Array Values"
- "Logic Execution Log"
```

### 5. Notifications & Alerts
Alert messages should speak to research objectives, not technical issues.

**Good:**
```
- "Sample goal reached: 500 completed responses"
- "10 responses flagged for quality review"
- "Survey is now live and collecting responses"
```

**Bad:**
```
- "Count variable = 500, stopping data collection"
- "10 records failed validation check"
- "Server endpoint now accepting POST requests"
```

---

## Context-Specific Guidelines

### For Research Managers
- Focus on research objectives and sample quality
- Emphasize data quality and validity
- Use survey methodology terminology
- Highlight actionable insights

### For Survey Respondents
- Use simple, clear language
- Avoid research jargon entirely
- Focus on user actions (select, type, choose)
- Never expose methodology terms

### For Stakeholders
- Focus on business outcomes
- Use accessible, non-technical language
- Emphasize ROI and insights
- Avoid both technical and research jargon

---

## Examples by Use Case

### Dashboard Labels

**Good:**
```
- Total Respondents: 750
- Data Quality: 85% Passed
- Sample Progress: 90% of Goal
- Avg. Completion Time: 8 minutes
```

**Bad:**
```
- Record Count: 750
- Validation Pass Rate: 85%
- Quota Fill: 90%
- Avg. Timer Value: 8 mins
```

### Data Quality Reports

**Good:**
```
✓ Data Quality Check
  - 85 responses passed all quality criteria

⚠ Open-End Quality
  - 10 responses flagged for review
  - Questions Q1, S11 require attention

⚠ Straight-Lining Detection
  - 12 respondents showed repetitive patterns

✗ Completion Speed Validation
  - 5 responses completed too quickly
```

**Bad:**
```
✓ Skip Logic Validation
  - 85 records passed validation function

⚠ Gibberish Detection
  - 10 strings failed quality check
  - Questions Q1, S11 have bad data

⚠ Pattern Matching
  - 12 records have identical values

✗ Timer Check
  - 5 records below minimum duration
```

### Survey Status Messages

**Good:**
```
- "Survey is collecting responses"
- "Sample goal: 800 respondents"
- "Currently collected: 700 responses"
- "Estimated completion: 2 days"
```

**Bad:**
```
- "Endpoint is active"
- "Target variable: 800"
- "Current count: 700"
- "ETA calculation: 2 days"
```

---

## Quality Checklist

Before releasing any survey interface, verify:

- [ ] All labels use research terminology
- [ ] No technical terms visible to users
- [ ] Error messages are user-friendly
- [ ] Help text explains research concepts
- [ ] Reports use professional language
- [ ] Notifications are context-appropriate
- [ ] No code/developer jargon anywhere
- [ ] Language appropriate for target audience
- [ ] Consistent terminology throughout
- [ ] Accessible to non-technical users

---

## Maintaining Standards

### Review Process
1. **Before Generation**: Review questionnaire for technical terms
2. **During Generation**: Apply terminology standards to all labels
3. **After Generation**: Audit all user-facing text
4. **Before Launch**: Final terminology review

### Common Mistakes to Avoid
- Using "Skip Logic" instead of "Response Routing"
- Exposing validation logic in error messages
- Technical terms in data quality reports
- Programming concepts in help text
- Developer jargon in notifications

### Quick Reference

When unsure, ask:
- "Would a research manager understand this?"
- "Does this expose how the code works?"
- "Is this explaining WHAT or HOW?"
- "Would I use this term in a client presentation?"

If the answer suggests technical exposure, rephrase using research terminology.

---

## Integration with Other Specifications

This terminology specification works alongside:

- **survey-ui-theme.md**: Visual styling standards
- **survey-logic-spec.md**: Logic implementation (internal)
- **survey-question-types.md**: Question formatting
- **survey-components-spec.md**: UI component labels

All specifications must maintain consistent professional terminology.
