# Survey Question Types Specification

This document defines all supported question types and their exact specifications for consistent survey generation.

**Reference**: Works with `survey-ui-theme.md`, `survey-structure-spec.md`, and `survey-components-spec.md`

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
- No navigation (end of survey)

**Example**:
```
[TERM1] [Termination Screen]

Thank you for your interest in this survey. Unfortunately, you do not meet the 
qualification criteria for this particular study. We appreciate your time.
```

**Use Cases**:
- Disqualification messages
- Quota full messages
- Survey completion thank you

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
- Min/max character length
- Pattern matching (email, phone, etc.)

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
- Min/max character length
- Word count limits

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
- Required: Must answer all rows
- Optional: Can skip rows
- Randomize rows: Shuffle row order
- Randomize columns: Shuffle column order

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

