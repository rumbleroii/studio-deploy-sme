# Verizon Business Wireless Survey Application

A complete Next.js survey application built with TypeScript, featuring both an **authoring/design view** and a **hosted survey experience** with full navigation, logic evaluation, and state management.

## 🎯 Features

### Authoring View (Design Mode)
- **Survey Generation UI** with exact theme specifications
- **Collapsible sections** with question counts
- **Question badges** (ID, type, logic, metadata)
- **Notes sections** with yellow background
- **Visual representation** of all questions, options, and logic
- **Exact styling** following survey-ui-theme specifications

### Hosted Survey (Respondent Experience)
- **Welcome screen** with survey introduction
- **Question-by-question flow** with navigation
- **Progress indicator** showing completion percentage
- **Previous/Next buttons** for navigation
- **Real-time logic evaluation** (skip logic, show/hide, conditional routing)
- **Response validation** with error messages
- **Auto-save** to localStorage
- **Thank you screen** upon completion
- **Termination screen** for disqualified respondents

### Question Types Supported
- ✅ Introduction screens
- ✅ Single choice (radio buttons)
- ✅ Multiple choice (checkboxes)
- ✅ Matrix/Grid questions
- ✅ Text input
- ✅ Numeric input
- ✅ Rating scales

### Logic Features
- ✅ Conditional logic (show/hide questions)
- ✅ Skip logic (routing based on responses)
- ✅ Termination logic
- ✅ Piping (dynamic text insertion)
- ✅ Randomization and anchoring
- ✅ Complex AND/OR conditions

## 📁 Project Structure

```
survey-app/
├── app/
│   ├── page.tsx                      # Authoring view (home page)
│   ├── layout.tsx                    # Root layout
│   ├── globals.css                   # Global styles (exact theme specs)
│   └── s/[surveyId]/                 # Hosted survey routes
│       ├── page.tsx                  # Welcome screen
│       ├── layout.tsx                # Survey layout with context
│       ├── question/page.tsx         # Question screen
│       ├── complete/page.tsx         # Thank you screen
│       └── terminate/page.tsx        # Termination screen
├── components/
│   ├── Badge.tsx                     # Badge components
│   ├── QuestionCard.tsx              # Question card for authoring view
│   ├── QuestionRenderer.tsx          # Question renderer for hosted view
│   └── SurveySection.tsx             # Collapsible section component
├── data/
│   └── sample-survey.ts              # Survey data (SINGLE SOURCE for both views)
├── lib/
│   ├── survey-context.tsx            # React Context for state management
│   └── logic-evaluator.ts            # Logic evaluation engine
├── types/
│   └── survey.ts                     # TypeScript type definitions
└── package.json                      # Dependencies
```

## 🏗️ Architecture: Single Source of Truth

**Important:** This application uses a **single TypeScript file** for survey data:

```
data/sample-survey.ts (SINGLE SOURCE)
        ↓                    ↓
Authoring View          Hosted Survey
(Design/Preview)        (Respondent Experience)
```

**What this means:**
- ✅ **Update one file** → Both views update automatically
- ✅ **Add a question** → Appears in both authoring and hosted views
- ✅ **Modify logic** → Evaluates in both views instantly
- ✅ **Type-safe** → TypeScript validates everything
- ✅ **No sync issues** → Always consistent

**See documentation:** `.claude/skills/survey-hosted/survey-data-architecture.md`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to see the **authoring view**.

Open [http://localhost:3001/s/verizon-2025](http://localhost:3001/s/verizon-2025) to take the **hosted survey**.

### Build for Production

```bash
npm run build
npm start
```

## 📊 Survey Data

The survey is based on a Verizon Business Wireless questionnaire with the following sections:

1. **Screener** (3 questions)
   - S11: Number of wireless lines
   - CUSTOMER_TYPE: Primary carrier
   - CONCEPT_ASSIGNMENT: Introduction

2. **Concept Evaluation** (6 questions)
   - Q4: Service selection (multiple choice with pricing)
   - Q5: Likelihood to add services (single choice)
   - Q5a: Likelihood by carrier (matrix question)
   - Q6: Action if plan doesn't qualify (conditional, Verizon customers only)
   - Q7: Percentage of lines to add (conditional, based on concept and selection)
   - Q8: Reasons for not selecting (conditional, if service not selected)

## 🎨 Theme Specifications

The app follows **exact specifications** from survey-ui-theme.md:

### Colors
- Question ID Badge: `#3D1C35` (maroon)
- Question Type Badge: `#F5F5F5` (light gray)
- Primary Accent: `#3D1C35` (maroon)
- Logic Badges (Default/Conditional/Dynamic): `#3D1C35` (maroon)
- Show Condition Badge: `#E0BFD8` (light maroon)
- Primary Text: `#1A1A1A`
- Secondary Text: `#666666`
- Notes Background: `#E0BFD8` (light maroon)
- Notes Border: `#3D1C35` (maroon)

### Typography
- Page Title: 32px, Bold (700)
- Section Title: 16px, Semi-bold (600)
- Question Text: 15px, Regular (400)
- Option Text: 14px, Regular (400)
- Badge Text: 11px, Semi-bold (600), UPPERCASE

### Spacing
- Page Padding: 40px horizontal, 32px vertical
- Section Padding: 24px
- Question Padding: 20px
- Between Options: 8px

### Components
- Radio Buttons: 20px diameter
- Checkboxes: 20px squares with 3px radius
- Card Border Radius: 8px
- Badge Border Radius: 4px

## 🧪 Testing the Survey

### Test the Authoring View
1. Visit [http://localhost:3001](http://localhost:3001)
2. Verify all sections are collapsible
3. Check that all badges are displayed correctly
4. Ensure notes sections have yellow background

### Test the Hosted Survey
1. Visit [http://localhost:3001/s/verizon-2025](http://localhost:3001/s/verizon-2025)
2. Click "Start Survey"
3. Answer questions and test navigation:
   - Enter a number for S11 (e.g., 100)
   - Select "Verizon" for CUSTOMER_TYPE to see Q6
   - Select services in Q4 to see price calculation in Q5
   - Test Previous/Next buttons
   - Verify progress bar updates
4. Test validation by clicking Next without answering required questions
5. Complete survey to see thank you screen

### Test Logic Evaluation
- **Q6 Show Logic**: Only shows if CUSTOMER_TYPE = "Verizon"
- **Q7 Show Logic**: Shows if specific services selected in Q4
- **Q8 Show Logic**: Shows if specific services NOT selected in Q4
- **Piping**: Q5 shows calculated price from Q4 selections
- **Progress**: Updates as you move through questions

## 🔧 Customization

### Adding New Questions

Edit `data/sample-survey.ts`:

```typescript
{
  id: 'NEW_Q1',
  type: 'single_choice',
  text: 'Your question text?',
  required: true,
  options: [
    { id: 1, label: 'Option 1', value: 'opt1' },
    { id: 2, label: 'Option 2', value: 'opt2' }
  ],
  defaultNextQuestion: 'NEXT_Q_ID',
  notes: ['Any implementation notes']
}
```

### Adding Conditional Logic

```typescript
logic: [
  {
    action: 'show', // or 'hide', 'skip', 'terminate'
    when: {
      operator: 'eq',
      left: 'QUESTION_ID',
      right: 'expected_value'
    },
    destination: 'TARGET_Q_ID' // optional
  }
]
```

## 📝 Notes

- **State Management**: Uses React Context API with localStorage persistence
- **Auto-save**: Responses automatically saved to localStorage
- **Theme Consistency**: Both views use exact same styling specifications
- **Mobile Responsive**: Works on desktop, tablet, and mobile devices
- **Type Safety**: Full TypeScript support throughout

## 🎓 Key Implementation Details

### Logic Evaluation
The `logic-evaluator.ts` module handles:
- Expression evaluation (eq, neq, gt, lt, in, notIn, etc.)
- AND/OR compound conditions
- Next question determination
- Response validation
- Text piping (dynamic content insertion)

### State Management
The `survey-context.tsx` provides:
- Global response storage
- Current question tracking
- Visited questions history
- Progress calculation
- Persistent storage via localStorage

### Navigation Flow
1. User answers question
2. Validation runs on "Next" click
3. Logic evaluator determines next question ID
4. Router navigates to next question or completion screen
5. Progress bar updates automatically

## 📄 License

This project was created as a demonstration of survey generation and implementation following exact specifications from the Claude Code survey-generation skill.

---

**Created with**: Next.js 15, React 19, TypeScript, Tailwind CSS
**Survey Data**: Based on Verizon Business Wireless Add-On Services questionnaire
