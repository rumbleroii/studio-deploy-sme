# Survey Generation - Quick Reference Card

One-page cheat sheet for generating consistent surveys.

---

## 🎯 Core Principle
**Every survey must look IDENTICAL. Use exact values. No variations.**

---

## 📁 Files to Know

| File | Purpose | When to Use |
|------|---------|-------------|
| **SURVEY-SPECS-INDEX.md** | Master index | Start here |
| **survey-generation-guide.md** | Step-by-step process | Generating surveys |
| **VISUAL-REFERENCE.md** | Quick visual ref | Fast lookups |

---

## 🎨 Essential Values

### Colors (Exact Hex)
```
#3D1C35  Maroon (Question ID, Default Logic)
E0BFD8  Purple (Conditional Logic)
E0BFD8  Cyan (Dynamic Options)
#FF9800  Orange (Show Condition)
#1A1A1A  Black (Text Primary)
#666666  Gray (Text Secondary)
#E0E0E0  Light Gray (Borders)
#FFF9E6  Light Yellow (Notes BG)
#FFC107  Amber (Notes Border)
```

### Typography (Exact Sizes)
```
32px  Page Title (Bold 700)
16px  Section Title (Semi-bold 600)
15px  Question Text (Regular 400)
14px  Option Text (Regular 400)
11px  Badge Text (Semi-bold 600, UPPERCASE)
```

### Spacing (Exact Pixels)
```
40px  Page horizontal padding
24px  Section padding
20px  Question padding
8px   Between options
```

### Components (Exact Sizes)
```
20px  Radio button (circle)
20px  Checkbox (square, 3px radius)
8px   Card border radius
4px   Badge border radius
```

---

## 📋 Required Elements

Every survey MUST have:
- ✅ Page title (32px, bold)
- ✅ Objectives section (bulleted list)
- ✅ Audience section (sample size, quotas)
- ✅ Collapsible sections with question counts
- ✅ Question ID badge (pink, 11px, uppercase)
- ✅ Question type badge (gray, 11px)
- ✅ Metadata badges (logic, randomization, etc.)
- ✅ Notes sections (yellow bg, amber border)

---

## 🏷️ Badge Colors

| Badge Type | Background | Text | Border |
|------------|------------|------|--------|
| Question ID | #3D1C35 | White | None |
| Question Type | #F5F5F5 | #666666 | None |
| Default Logic | #3D1C35| White | None |
| Conditional Logic | #9C27B0 | White | None |
| Show Condition | White | #FF9800 | 1px #FF9800 |
| Randomization | #3D1C35 | White | None |
| Dynamic Options | #3D1C35 | White | None |

---

## 📐 Structure Template

```
[Project Name]                    32px Bold
  ↓ 32px
Objectives                        16px Semi-bold
• Item 1                          14px Gray
• Item 2
  ↓ 24px
Audience                          16px Semi-bold
Sample Size (N) = 500             14px Gray
Quotas: ...
  ↓ 32px
Questionnaire                     16px Semi-bold
  ↓ 16px
┌─────────────────────────────┐
│ Section 1: Name  N Qs    ▼ │  Collapsible header
└─────────────────────────────┘
┌─────────────────────────────┐
│ ┌─────────────────────────┐ │
│ │ [ID] [Type]             │ │  Question badges
│ │                         │ │
│ │ Question text           │ │  15px
│ │   ↓ 16px                │ │
│ │ ○ Option 1              │ │  14px, 20px radio
│ │   ↓ 8px                 │ │
│ │ ○ Option 2              │ │
│ │   ↓ 16px                │ │
│ │ [Badge] [Badge]         │ │  Metadata
│ │   ↓ 16px (if notes)     │ │
│ │ ┌─────────────────────┐ │ │
│ │ │ Notes:              │ │ │  Yellow bg
│ │ │ • Note 1            │ │ │
│ │ └─────────────────────┘ │ │
│ └─────────────────────────┘ │
│   ↓ 20px                    │
│ [Next Question]             │
└─────────────────────────────┘
```

---

## ✅ Quick Checklist

Before presenting survey:
- [ ] Colors match spec (pink badges, gray text)
- [ ] Fonts match spec (32px title, 15px question, 11px badge)
- [ ] Spacing matches spec (40px page, 8px options)
- [ ] All badges present (ID, type, logic)
- [ ] Notes sections have yellow bg and amber border
- [ ] Radio buttons are 20px circles
- [ ] Checkboxes are 20px squares with 3px radius

---

## 🚫 Never Do

❌ Change colors from specification
❌ Change font sizes from specification
❌ Change spacing from specification
❌ Omit question ID or type badges
❌ Use different badge colors
❌ Skip metadata badges
❌ Forget notes sections
❌ Use inconsistent spacing

---

## ✅ Always Do

✅ Use exact hex colors
✅ Use exact pixel sizes
✅ Include all required badges
✅ Include notes sections
✅ Maintain consistent spacing
✅ Follow structure template
✅ Verify against checklist

---

## 🔍 Common Question Types

| Type | Badge Text | Input |
|------|------------|-------|
| Introduction | Introduction Screen | None |
| Single Choice | Single Choice | Radio buttons (○) |
| Multiple Choice | Multiple Choice | Checkboxes (☐) |
| Grid/Matrix | Grid / Matrix | Table with radios |
| Text Input | Text Input | Text field |
| Text Area | Text Area | Textarea |
| Dropdown | Dropdown | Select (▼) |

---

## 🏷️ Logic Badge Formats

```
[Default → SCR2]
[IF response = [1] → TERM1]
[IF response = [1, 6, 7] → TERM1]
[👁 Show Condition: BA3 != 99]
[🔀 Randomized (anchored: 6, 99)]
[🔗 Dynamic Options from: BA4]
```

---

## 🔄 Piping/Text Substitution

**Detect These Patterns:**
```
{{Q1}}, {Q1}, [Q1], <Q1>, $Q1$
INSERT Q1 RESPONSE
{{Q1 label}}, {Q1 option}
```

**Convert to Standard:**
```
[INSERT Q1]         → Raw value
[INSERT Q1 LABEL]   → Option label
[INSERT Q1.SUM]     → Custom calculation
```

**Examples:**
```
Questionnaire → Schema
──────────────────────────────────────────
"You said {{Q1}}"        → "You said [INSERT Q1]"
"You chose {Q3 option}"  → "You chose [INSERT Q3 LABEL]"
"Total: $sum of Q4$"     → "Total: $[INSERT Q4.SUM]"
```

**Works in:** Both authoring and respondent views automatically ✅

---

## 📊 Matrix Table Format

```
Column Attributes
Attr1 | Attr2 | Attr3

Scale Points
1  Description 1
2  Description 2
3  Description 3

┌─────────┬─────┬─────┬─────┐
│         │  1  │  2  │  3  │  Header: #F5F5F5
├─────────┼─────┼─────┼─────┤
│ Row 1   │  ○  │  ○  │  ○  │  Data: #FFFFFF
│ Row 2   │  ○  │  ○  │  ○  │  Alt: #FAFAFA
└─────────┴─────┴─────┴─────┘
```

---

## 💡 Quick Tips

1. **Start with** `survey-generation-guide.md`
2. **Reference** `VISUAL-REFERENCE.md` for quick lookups
3. **Verify** against checklist before presenting
4. **Use exact values** - no approximations
5. **Maintain consistency** - every survey identical

---

## 🎯 Success = Consistency

Every survey from any questionnaire should:
- Look the same ✅
- Use same colors ✅
- Use same fonts ✅
- Use same spacing ✅
- Have same structure ✅
- Include same elements ✅

---

## 📞 Need More Detail?

| Topic | See Document |
|-------|--------------|
| Full process | survey-generation-guide.md |
| All colors/fonts | ../shared/survey-ui-theme.md |
| Layout structure | survey-structure-spec.md |
| Components | ../shared/survey-components-spec.md |
| Question types | ../shared/survey-question-types.md |
| Logic/routing | ../shared/survey-logic-spec.md |
| Visual examples | VISUAL-REFERENCE.md |

---

**Print this page and keep it handy for quick reference!**

