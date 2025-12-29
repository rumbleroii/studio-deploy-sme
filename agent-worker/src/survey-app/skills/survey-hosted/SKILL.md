---
name: survey-hosted
description: Implements hosted survey runtime for respondents using the existing Next.js app at app as boilerplate. Typically auto-triggered after survey-generation skill completes. Updates existing routes in app/app/s/preview/ for welcome screen, question screens, navigation (Previous/Next), progress tracking, logic evaluation, and thank you screen. NEVER creates apps from scratch - always modifies existing boilerplate. Keyword triggers - hosted survey, survey runtime, respondent experience, survey flow, implement survey, build survey, deploy survey.
---

# Survey Hosted Skill

## Purpose

This skill provides specifications for updating the **hosted survey runtime** in the existing `app` application - the actual survey experience that respondents take.

## Boilerplate Application

**CRITICAL:** Always use the existing Next.js app at `app` as the foundation:

- **Location:** `app/app/s/preview/` directory
- **Never create from scratch:** Always modify existing routes
- **Existing routes:**
  - `app/app/s/preview/page.tsx` - Welcome screen
  - `app/app/s/preview/question/page.tsx` - Question screens
  - `app/app/s/preview/complete/page.tsx` - Thank you screen
  - `app/app/s/preview/terminate/page.tsx` - Termination screen
- **Components:** Reuse from `app/components/`
- **Theme:** Already implemented in `app/app/globals.css`

## CRITICAL ROUTING RULES ⚠️

**ALWAYS use these exact routes for navigation:**

```typescript
// ✅ CORRECT - Use /s/preview/ paths
router.push(`/s/preview/question?q=${nextQuestionId}`);
router.push(`/s/preview/complete`);
router.push(`/s/preview/terminate`);

// ❌ WRONG - Never use surveyId in paths (will be undefined)
router.push(`/s/${surveyId}/complete`);
router.push(`/s/${surveyId}/terminate`);
```

**Route Pattern:**

- Base: `/s/preview/`
- Welcome: `/s/preview`
- Questions: `/s/preview/question?q={questionId}` (query param, not dynamic route)
- Complete: `/s/preview/complete`
- Terminate: `/s/preview/terminate`

## Part of Sequential Workflow

**IMPORTANT:** This skill is typically auto-triggered after the `survey-generation` skill completes to provide a complete survey system (authoring view + respondent experience).

### Sequential Trigger:

- **Primary workflow:** survey-generation → survey-hosted (automatic)
- **Standalone workflow:** survey-hosted only (when explicitly requested)

### Complete Survey System:

1. **survey-generation** creates the authoring/design view
2. **survey-hosted** (this skill) creates the respondent runtime experience

## When to Use This Skill

### Auto-Triggered:

This skill is automatically activated after survey-generation completes when user requests a complete survey.

### Standalone Use:

Use this skill independently when the user:

- Asks to "implement a hosted survey" or "build the survey runtime"
- Wants to create the "respondent experience" or "survey taking flow"
- Mentions "survey deployment" or "publish survey"
- Requests "survey navigation" or "survey flow"
- Asks to build survey routes like `/s/[surveyId]`
- Wants to implement welcome screens, question screens, or thank you screens
- Mentions "survey logic evaluation" or "skip logic"

## Instructions

### Step 1: Understand the Boilerplate Structure

**ALWAYS work with existing routes in `app/app/s/preview/`:**

```
app/app/s/preview/
├── page.tsx                    # Welcome screen (already exists)
├── question/page.tsx           # Question screens (already exists)
├── complete/page.tsx           # Thank you screen (already exists)
├── terminate/page.tsx          # Termination screen (already exists)
└── layout.tsx                  # Layout wrapper (already exists)
```

### Step 2: Understand the Scope

The hosted survey is different from the questionnaire view:

- **Questionnaire view** (`app/app/page.tsx`) = Design/authoring interface (shows all questions)
- **Hosted survey** (`app/app/s/preview/*`) = Respondent-facing experience (one question at a time)

This skill is for updating the hosted survey (respondent experience).

### Step 3: Understand the Flow

```
Welcome Screen (/s/preview/)
        ↓
Question Screens (/s/preview/question)
├── Question display
├── Input collection
├── Validation
├── Progress indicator
└── Navigation (Previous/Next)
        ↓
Thank You Screen (/s/preview/complete)
```

### Step 4: Update Existing Routes

**Do NOT create new routes. Update existing ones:**

#### A. Welcome Screen

- Update `app/app/s/preview/page.tsx`
- Ensure it reads the correct survey schema
- Maintain existing structure and theme

#### B. Question Screens

- Update `app/app/s/preview/question/page.tsx`
- Verify navigation logic works with updated schema
- Reuse existing QuestionRenderer component

#### C. Navigation Logic

Already implemented, verify:

- Previous/Next button functionality
- Skip logic evaluation
- Conditional routing
- Progress calculation
- Question sequencing

#### D. State Management

Already implemented in existing routes, verify:

- Current question ID tracking
- Responses (Record<questionId, answer>)
- Visited questions
- Progress percentage
- Survey completion status

#### E. Logic Evaluation

Reference: `survey-navigation-spec.md` and `../shared/survey-logic-spec.md`

Verify real-time evaluation works:

- Show/hide conditions
- Skip logic (conditional routing)
- Display conditions
- Dynamic options
- Branching flows
- **Piping/text substitution** (displays previous answers in question text)

**Piping in Respondent View:**

- Automatically replaces `[INSERT Q#]` with answer values
- Replaces `[INSERT Q# LABEL]` with option labels
- Updates in real-time as user answers questions
- Shows `[No response]` if question not yet answered
- Works for all question types (single choice, multiple choice, text, etc.)
- Implementation: QuestionRenderer receives `allQuestions` prop for label lookups

### Step 5: Apply Theme Consistency

**CRITICAL:** Use the **exact same theme** as questionnaire view.

Reference: `../shared/survey-ui-theme.md`

**Theme specifications:**

- Colors: #3D1C35 (accent), #1A1A1A (text), #666666 (secondary), #E0E0E0 (borders)
- Fonts: 32px title, 15px question, 14px option
- Spacing: 40px page padding, 24px section padding, 8px option gap
- Components: 20px radio/checkbox, 8px border radius

**Key differences from questionnaire view:**

- Hide metadata badges (logic is evaluated, not displayed)
- Hide notes sections (internal use only)
- Show progress indicator
- Show Previous/Next buttons
- One question per screen (not all questions)
- Logic evaluated, not displayed

### Step 6: Verify Key Features

**Existing features to verify work correctly:**

- Welcome screen with survey title and start button
- Question screens with proper formatting
- Previous and Next buttons
- Progress indicator (percentage or bar)
- Real-time logic evaluation
- Response validation before allowing Next
- Auto-save responses (localStorage)
- Thank you screen at completion
- Mobile responsive design
- Keyboard navigation support

**Only implement if explicitly requested:**

- Save and continue later
- Browser back button support
- Estimated time remaining
- Question numbering (e.g., "Question 5 of 20")

### Step 7: Verify Implementation

Check that existing functionality works:

- [ ] Routes exist at `app/app/s/preview/*`
- [ ] Welcome screen displays correct survey
- [ ] Question screens navigate properly
- [ ] Thank you screen displays on completion
- [ ] Navigation logic working (Previous/Next)
- [ ] Progress tracking accurate
- [ ] Logic evaluation works with updated schema
- [ ] Validation working
- [ ] Auto-save functional
- [ ] Theme consistent with questionnaire view
- [ ] Mobile responsive
- [ ] Accessible (keyboard + screen reader)

## Key Files Reference

### Must Read First:

1. **survey-implementation-guide.md** - Step-by-step guide

### Skill-Specific:

2. **survey-runtime-spec.md** - Runtime architecture and patterns
3. **survey-routes-spec.md** - Next.js routing structure
4. **survey-navigation-spec.md** - Navigation logic and flow control
5. **survey-data-architecture.md** - Data storage patterns

### Shared Specifications (in ../shared/):

6. **../shared/survey-ui-theme.md** - Exact theme specifications
7. **../shared/survey-terminology-spec.md** - Professional language standards (MANDATORY)
8. **../shared/survey-logic-spec.md** - Logic evaluation (referenced for implementation)
9. **../shared/survey-question-types.md** - Question rendering formats
10. **../shared/survey-components-spec.md** - Component specifications
11. **../shared/performance-optimization-spec.md** - Performance optimizations (MANDATORY)

## Examples

### Example 1: User wants hosted survey to work

**User:** "Make sure the hosted survey works with the updated questionnaire"

**Action:**

1. Verify existing routes at `app/app/s/preview/*`
2. Check welcome screen reads correct survey schema
3. Confirm question screens navigate properly with updated schema
4. Test logic evaluation with new questions/conditions
5. Verify theme consistency maintained
6. Test end-to-end flow

### Example 2: User asks about survey flow

**User:** "How does the survey navigation work?"

**Action:**

1. Reference survey-navigation-spec.md
2. Explain existing Previous/Next implementation
3. Describe skip logic evaluation in place
4. Show progress tracking implementation
5. Demonstrate conditional routing

### Example 3: User wants to update hosted routes

**User:** "Update the hosted survey to show estimated time"

**Action:**

1. Read `app/app/s/preview/question/page.tsx`
2. Add time estimation logic, default should be 5 mins.
3. Update UI to display estimated time
4. Maintain existing theme and structure
5. Test with existing components

## Technical Implementation

### State Shape

```typescript
interface SurveyState {
  surveyId: string;
  responses: Record<string, any>;
  currentQuestionId: string;
  visitedQuestions: string[];
  progress: number;
  startedAt: Date;
  completedAt?: Date;
}
```

### Navigation Function

```typescript
function getNextQuestion(
  currentQuestionId: string,
  responses: Record<string, any>,
  surveySchema: Survey
): string | null {
  // Evaluate logic conditions
  // Return next question ID or null if complete
}
```

### Logic Evaluation

```typescript
function evaluateCondition(
  condition: LogicCondition,
  responses: Record<string, any>
): boolean {
  // Evaluate show/hide/skip conditions
  // Return true if condition is met
}
```

## Critical Requirements

### Always:

- Work within existing `app/app/s/preview/*` routes
- Update existing route files, don't recreate them
- Preserve theme in `app/app/globals.css`
- Reuse existing components from `app/components/`
- Verify all features work with updated schema
- Maintain same theme as questionnaire view
- Keep mobile responsive design
- Maintain accessibility features
- **MAINTAIN all performance optimizations** (lazy loading, code splitting, Suspense, good web vital scores)
- Keep `app/next.config.js` optimization settings intact
- Use lazy loading for QuestionRenderer with Suspense
- Preserve loading.tsx files in all routes
- **USE RESEARCH MANAGER TERMINOLOGY ONLY** - Never expose technical terms to respondents (see ../shared/survey-terminology-spec.md)

### Verify These Features Exist and Work:

- Welcome screen with start button
- One question per screen
- Previous and Next buttons
- Progress indicator
- Logic evaluation (real-time)
- Response validation
- Auto-save (localStorage)
- Thank you screen
- Termination screen

### Never:

- Create new Next.js app from scratch
- Modify `app/app/globals.css` theme
- Recreate existing routes unnecessarily
- Change theme colors, fonts, or spacing
- Show metadata badges to respondents
- **Remove or modify performance optimizations** in next.config.js
- Remove lazy loading or Suspense wrappers from QuestionRenderer
- Delete loading.tsx files
- Add heavy imports without lazy loading
- Display notes sections to respondents
- Skip testing with updated schema

## Success Criteria

A successful hosted survey update means:

- Existing routes at `app/app/s/preview/*` work correctly
- Respondents can complete survey start to finish
- Navigation works with updated schema (Previous/Next)
- Logic evaluates properly with new questions/conditions
- Responses are saved reliably
- Validation works correctly
- Theme consistency maintained
- Mobile friendly
- Accessible (keyboard + screen reader)
- Fast page transitions
- No data loss on refresh

## Integration with Survey Generation

### Sequential Workflow

The hosted survey is typically part of a two-step process:

1. **survey-generation skill** updates questionnaire schema in `app/data/`
2. **survey-hosted skill** (this skill, auto-triggered) verifies hosted routes work with updated schema

### Data Flow

1. Survey-generation updates schema in `app/data/`
2. Hosted routes at `app/app/s/preview/*` read the updated schema
3. Respondents take the survey using hosted experience
4. Responses are collected and stored in localStorage
5. Both authoring and hosted views use the same boilerplate app

### Theme Consistency

Both skills use the **exact same theme** from `app/app/globals.css` for consistency. The authoring view (`app/app/page.tsx`) and respondent experience (`app/app/s/preview/*`) are visually aligned (same colors, fonts, spacing, components).

---

# Final Step: Start Development Server

**IMPORTANT:** After completing ALL work for both survey-generation and survey-hosted skills, start the development server:

### Action Required:

1. Navigate to the survey-app directory: `cd app`
2. Start the Next.js development server: `npm run dev`

### When to Execute:

- ✅ Execute this step **ONLY AFTER** both skills have completed all their tasks
- ✅ This is the final step of the survey implementation workflow
- ✅ The server must be running for users to view the survey

### Note:

If the server is already running, you can skip this step. Only start it if it's not currently running.
