---
name: survey-hosted
description: Implements hosted survey runtime for respondents using the existing Next.js app at app as boilerplate. Typically auto-triggered after survey-generation skill completes. Updates existing routes in app/app/survey/ for welcome screen, question screens, navigation (Previous/Next), progress tracking, logic evaluation, and thank you screen. NEVER creates apps from scratch - always modifies existing boilerplate. Keyword triggers - hosted survey, survey runtime, respondent experience, survey flow, implement survey, build survey, deploy survey.
---

# Survey Hosted Skill

## Purpose

This skill provides specifications for updating the **hosted survey runtime** in the existing `app` application - the actual survey experience that respondents take.

## Boilerplate Application

**CRITICAL:** Always use the existing Next.js app at `app` as the foundation:

- **Location:** `app/app/survey/` directory
- **Never create from scratch:** Always modify existing routes
- **Existing routes:**
  - `app/app/survey/page.tsx` - Welcome screen
  - `app/app/survey/question/page.tsx` - Question screens
  - `app/app/survey/complete/page.tsx` - Thank you screen
  - `app/app/survey/terminate/page.tsx` - Termination screen
- **Components:** Reuse from `app/components/`
- **Theme:** Already implemented in `app/app/globals.css`

## CRITICAL ROUTING RULES ⚠️

**ALWAYS use these exact routes for navigation:**

```typescript
// ✅ CORRECT - Use /survey/ paths
router.push(`/survey/question?q=${nextQuestionId}`);
router.push(`/survey/complete`);
router.push(`/survey/terminate`);

// ❌ WRONG - Never use surveyId in paths (will be undefined)
router.push(`/s/${surveyId}/complete`);
router.push(`/s/${surveyId}/terminate`);
```

**Route Pattern:**

- Base: `/survey/`
- Welcome: `/survey`
- Questions: `/survey/question?q={questionId}` (query param, not dynamic route)
- Complete: `/survey/complete`
- Terminate: `/survey/terminate`

## Part of Sequential Workflow

**IMPORTANT:** This skill MUST BE triggered after the `survey-generation` skill completes to provide a complete survey system (authoring view + respondent experience).

### Sequential Trigger:

- **Primary workflow:** survey-generation → survey-hosted
- **Standalone workflow:** survey-hosted only (when explicitly requested)

### Complete Survey System:

1. **survey-generation** creates the authoring/design view
2. **survey-hosted** (this skill) creates the respondent runtime experience

## ⚠️ User Communication Guidelines

**NEVER mention to the user:**

- ❌ Port numbers (e.g., "port 3001", "running on 3001")
- ❌ localhost URLs (e.g., "localhost:3001", "http://localhost")
- ❌ Server technical details (e.g., "server is running on", "visit http://")
- ❌ Command line instructions or technical setup

**ALWAYS communicate:**

- ✅ "The survey is ready for preview"
- ✅ "Survey implementation is complete"
- ✅ "You can now test the survey"
- ✅ Keep all responses simple and non-technical

---

## When to Use This Skill

### Auto-Triggered:

This skill MUST BE activated after survey-generation completes when user requests a complete survey.

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

### Step 1: Verify Survey Schema is Valid (CRITICAL - AUTO-VALIDATED)

**IMPORTANT: Survey schema validation happens AUTOMATICALLY in survey-generation skill!**

By the time survey-hosted skill is triggered, the survey schema has ALREADY been validated via:

```bash
# This command was AUTOMATICALLY executed by survey-generation skill
npx tsx test-validation.ts
```

**What was automatically checked:**
- ✅ Type mismatches (e.g., string vs number in showIf conditions)
- ✅ Logic conditions are correctly structured
- ✅ "ASK IF" patterns have both source routing AND target show conditions
- ✅ Matrix questions have rows (static or dynamic)
- ✅ All required fields present
- ✅ No structural errors

**Your task in survey-hosted skill:**
- Assume validation has ALREADY passed (survey-generation skill ensures this)
- If you encounter unexpected behavior, you MAY re-run validation: `npx tsx test-validation.ts`
- Focus on implementing the hosted survey runtime using the validated schema

**When to re-validate:**
- ⚠️ Only if you modify the survey schema during hosted implementation (rare)
- ⚠️ Only if user reports logic not working as expected
- ✅ Otherwise, proceed directly to Step 2

**See:** `survey-generation/SKILL.md` Step 7 for complete automatic validation documentation.

### Step 2: Understand the Boilerplate Structure

**ALWAYS work with existing routes in `app/app/survey/`:**

```
app/app/survey/
├── page.tsx                    # Welcome screen (already exists)
├── question/page.tsx           # Question screens (already exists)
├── complete/page.tsx           # Thank you screen (already exists)
├── terminate/page.tsx          # Termination screen (already exists)
└── layout.tsx                  # Layout wrapper (already exists)
```

### Step 2: Understand the Scope

The hosted survey is different from the questionnaire view:

- **Questionnaire view** (`app/app/page.tsx`) = Design/authoring interface (shows all questions)
- **Hosted survey** (`app/app/survey/*`) = Respondent-facing experience (one question at a time)

This skill is for updating the hosted survey (respondent experience).

### Step 3: Understand the Flow

```
Welcome Screen (/survey/)
        ↓
Question Screens (/survey/question)
├── Question display
├── Input collection
├── Validation
├── Progress indicator
└── Navigation (Previous/Next)
        ↓
Thank You Screen (/survey/complete)
```

### Step 4: Update Existing Routes

**Do NOT create new routes. Update existing ones:**

#### A. Welcome Screen

- Update `app/app/survey/page.tsx`
- Ensure it reads the correct survey schema
- Maintain existing structure and theme

#### B. Question Screens

- Update `app/app/survey/question/page.tsx`
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
- **Piping/text substitution**: Displays previous answers in question text (Section 5)
- **Hidden variables**: Computed values, URL params, random assignments (Section 6)
- **Loop navigation**: Iterator questions that repeat for each multi-select item

**CRITICAL - Value Type Preservation:**

When collecting responses from form inputs (radio, checkbox, text), preserve the original value type:

```typescript
// ✅ CORRECT - Preserve original type
onChange={() => handleChange(option.value)}  // Uses option.value directly

// ❌ WRONG - Always converts to string
onChange={(e) => handleChange(e.target.value)}  // HTML input always returns string
```

**Why this matters:**
- Source question stores `value: 20` (number)
- Target uses `showIf: { operator: 'eq', left: 'Q1', right: 20 }` (number)
- If response stored as `"20"` (string), condition fails: `"20" !== 20`

**See:** `components/QuestionRenderer.tsx:356` and `:529` for implementation.

**CRITICAL - "ASK IF" Pattern Implementation:**

When implementing routing for "ASK IF" patterns, ensure BOTH parts are handled:

1. **Source routing (skip logic):** Add skip logic to source question with `destination`
2. **Target show condition:** Add show condition to target question

**Example from `data/sample-survey.ts`:**

```typescript
// Source question (Q8e) - HAS skip logic
{
  id: 'Q8e',
  logic: [
    {
      action: 'skip',
      when: { operator: 'eq', left: 'Q8e', right: 'software' },
      destination: 'Q8f'  // ✅ Explicit routing
    }
  ],
  defaultNextQuestion: 'Q9'  // Fallback
}

// Target question (Q8f) - HAS show condition
{
  id: 'Q8f',
  logic: [
    {
      action: 'show',
      when: { operator: 'eq', left: 'Q8e', right: 'software' }  // ✅ Show condition
    }
  ]
}
```

**Working examples in `data/sample-survey.ts`:**
- Q8e-Q8g: A/B branching with both source routing and target show conditions
- Q6→Q7/Q8: Complete "ASK IF" pattern implementation
- S1: Termination logic example

**See `../shared/survey-logic-spec.md` for complete implementation details on:**

- All piping patterns (raw values, labels, counts, aggregates)
- Hidden variable types (url_param, computed, derived, timestamp, random)
- Runtime computation and formula evaluation
- Integration with show/hide conditions and navigation
- Complete routing and branching patterns

**See `../shared/advanced-features-spec.md` for advanced features:**

- Loop questions with `[INSERT LOOP_ITEM LABEL]` piping
- Per-column exclusivity in multi-grid questions
- External metadata piping with `[INSERT META:KEY]`
- Real-time termination warnings for text fields

#### F. Loop Question Navigation

When a question has `metadata.loopSourceQuestion`:

1. Check source question response for items to iterate
2. Filter out exclusive options (e.g., "None of the above")
3. If items exist, enter loop state
4. Present question for first item with piped text
5. Store response per loop item (e.g., `Q9_aldi`, `Q9_costco`)
6. On "Next", advance to next loop item or exit loop
7. Progress indicator should reflect loop iterations

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

### Step 7: Configure Database (Production Mode Only)

**CRITICAL:** If user wants production mode with API submission, database must be configured.

**Check if database setup is needed:**

```bash
# Check if MONGODB_URI exists in .env.local
grep MONGODB_URI .env.local
```

**If MONGODB_URI is missing, set it up:**

1. **Verify MongoDB is installed and running:**

```bash
# macOS - Check if MongoDB is installed
brew services list | grep mongodb

# If not installed:
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl status mongodb
```

2. **Add MONGODB_URI to `.env.local`:**

```bash
# For local MongoDB (development/testing)
MONGODB_URI="mongodb://localhost:27017/survey-studio"

# For MongoDB Atlas (production)
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/survey-studio"
```

3. **Generate Prisma Client:**

```bash
npx prisma generate
```

4. **Verify connection (optional):**

```bash
npx prisma db push
```

**When to skip database setup:**

- ✅ Skip if `NEXT_PUBLIC_DEPLOYMENT=development` (no API calls needed)
- ✅ Skip if user only wants authoring view testing
- ❌ Do NOT skip if `NEXT_PUBLIC_DEPLOYMENT=production` (API calls require database)

**Troubleshooting:**

- If submit endpoint fails → Check MongoDB is running and `MONGODB_URI` is set
- If Prisma errors → Run `npx prisma generate`
- See `DATABASE-SETUP.md` for detailed troubleshooting

---

### Step 8: Verify Implementation

**Schema validation was ALREADY completed by survey-generation skill automatically.**

**Check that existing functionality works:**

- [ ] Routes exist at `app/app/survey/*`
- [ ] Welcome screen displays correct survey
- [ ] Question screens navigate properly
- [ ] Thank you screen displays on completion
- [ ] Navigation logic working (Previous/Next)
- [ ] Progress tracking accurate
- [ ] Logic evaluation works with updated schema
- [ ] Conditional routing works correctly (Q8e→Q8f/Q8g pattern)
- [ ] Value types preserved (numbers stay numbers, strings stay strings)
- [ ] showIf conditions evaluate correctly
- [ ] Validation working
- [ ] Auto-save functional
- [ ] Theme consistent with questionnaire view
- [ ] Mobile responsive
- [ ] Accessible (keyboard + screen reader)

**Production Mode Additional Checks:**

- [ ] `MONGODB_URI` configured in `.env.local`
- [ ] MongoDB is running and accessible
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Submit endpoint responds successfully (check browser console)
- [ ] RespondentId is generated and saved to localStorage
- [ ] Responses are saved to database after each question

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
11. **../shared/advanced-features-spec.md** - Loop questions, per-column exclusivity, external metadata piping, real-time termination warnings

## Examples

### Example 1: User wants hosted survey to work

**User:** "Make sure the hosted survey works with the updated questionnaire"

**Action:**

1. Verify existing routes at `app/app/survey/*`
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

1. Read `app/app/survey/question/page.tsx`
2. Add time estimation logic, default should be 5 mins.
3. Update UI to display estimated time
4. Maintain existing theme and structure
5. Test with existing components

## API Integration

**CRITICAL:** The survey app includes full API integration for production deployments.

### API Endpoints

**API calls only happen in production mode** when `isProduction === true`:

1. **POST /api/submit**

   - Called after EVERY question submission (Next button click) in production mode
   - Saves responses incrementally to database
   - Generates and returns `respondentId` on first submission
   - Validates required fields and manages survey state
   - Status: 'incomplete' | 'complete' | 'terminated'

2. **GET /api/health**
   - Health check endpoint for studio app to ping survey status
   - Returns survey status, ID, timestamp, and version
   - Used to verify survey is live and accessible

### Environment Flag

```bash
# Environment variable: NEXT_PUBLIC_DEPLOYMENT
# Values: "development" | "production"
```

**What the flag controls:**

- **API submission**
  - Development mode: NO API calls
  - Production mode: API calls after each question
- **RespondentId tracking**
  - Development mode: NOT tracked
  - Production mode: Tracked in localStorage
- **Database saves**
  - Development mode: NO database interaction
  - Production mode: Responses saved to database

**Note:** Back button is always visible in both development and production modes.

### RespondentId Management

**Automatic tracking via localStorage (production mode only):**

```typescript
// Managed in lib/api.ts
getRespondentId(); // Retrieve from localStorage
setRespondentId(id); // Save to localStorage
clearRespondentId(); // Remove from localStorage (only in production)
```

**Flow (production mode only):**

1. Survey start: Clear respondentId (if isProduction)
2. First submission: Generate respondentId, save to localStorage
3. Subsequent submissions: Use existing respondentId from localStorage
4. Survey complete/terminate: Clear respondentId (if isProduction)

### Data Flow

**Development Mode:**

```
User clicks Next
  ↓
Validate response
  ↓
NO API CALL - responses stored in context only
  ↓
Navigate to next question
```

**Production Mode:**

```
User clicks Next
  ↓
Validate response
  ↓
Submit to /api/submit (only if isProduction)
  ↓
Receive respondentId (first time)
  ↓
Save to localStorage
  ↓
Navigate to next question
```

### Implementation Files

All API functionality is consolidated in:

- **lib/api.ts** - All API functions (submitResponses, getRespondentId, etc.)
- **types/api.ts** - TypeScript types for API contracts
- **app/api/submit/route.ts** - POST endpoint for saving responses
- **app/api/health/route.ts** - GET endpoint for health checks

### Complete Documentation

See `API-IMPLEMENTATION.md` in this skill folder for:

- Complete API specifications
- Request/response schemas
- Testing instructions
- MongoDB integration guide
- Production deployment notes

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

- Work within existing `app/app/survey/*` routes
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
- **Preserve API integration** - Ensure `/api/submit` is called after every Next button click (only when `isProduction === true`)
- Maintain respondentId management via localStorage (production mode only)
- Keep API submission logic in `question/page.tsx` intact with environment check (`if (isProduction)`)

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
- **❌ CRITICAL: Never show server details to user** - Do NOT mention port numbers, localhost URLs, or any technical server information in user-facing responses
- **Remove or modify API integration** from hosted survey routes
- **Remove environment checks around API submission** (must check `isProduction` before calling APIs)
- Remove respondentId management from localStorage
- Call APIs in development mode (APIs should only be called when `isProduction === true`)
- **Kill port 3001 if the server is already running** - always check first with `lsof -ti:3001`, do NOT kill if running
- Clear cache on every update (only clear when user reports stale content)
- **Edit production files** - Never modify these core files:
  - `lib/mongodb.ts` - Database connection (auto-configured during deployment)
  - `lib/api.ts` - API utilities (production-ready)
  - `app/api/submit/route.ts` - Submit endpoint (production-ready)
  - `app/api/health/route.ts` - Health check endpoint (production-ready)
  - `types/api.ts` - API type definitions (production-ready)

## Cache Troubleshooting

**Proactive Cache Clearing Scenarios:**

Clear cache BEFORE starting server if making these types of changes:

- ✅ Major updates to navigation logic or routing
- ✅ Changes to question rendering or display logic
- ✅ Modifying API integration or submission flow
- ✅ Updating core component behavior

**Reactive Cache Clearing:**

- ✅ User reports changes not reflecting
- ✅ Old navigation behavior still active
- ✅ Updated logic not working as expected
- ✅ Browser refresh doesn't show new content

**Command:**

```bash
cd agent-worker/src/survey-app
rm -rf .next node_modules/.cache
PORT=3001 npm run dev
```

---

## Success Criteria

A successful hosted survey update means:

**Note:** Schema validation was ALREADY completed automatically by survey-generation skill in Step 7. You are working with a pre-validated schema.

**Hosted Survey Functionality:**
- [ ] Existing routes at `app/app/survey/*` work correctly
- [ ] Respondents can complete survey start to finish
- [ ] Navigation works with updated schema (Previous/Next)
- [ ] Logic evaluates properly with new questions/conditions
- [ ] Conditional routing works (branching patterns like Q8e→Q8f/Q8g)
- [ ] Value types preserved correctly (no string/number conversion)
- [ ] showIf conditions evaluate as expected
- [ ] Responses are saved reliably
- [ ] Validation works correctly
- [ ] Theme consistency maintained
- [ ] Mobile friendly
- [ ] Accessible (keyboard + screen reader)
- [ ] Fast page transitions
- [ ] No data loss on refresh

**Production Mode Additional Success Criteria:**

- [ ] `MONGODB_URI` configured in `.env.local`
- [ ] MongoDB is running and accessible
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Submit endpoint working (responses saved to database)
- [ ] RespondentId generated and tracked in localStorage
- [ ] Database connection verified
- [ ] No API errors in browser console or server logs

## Integration with Survey Generation

### Sequential Workflow

The hosted survey is part of a three-step automated process:

1. **survey-generation skill** - Updates questionnaire schema in `app/data/`
2. **Automatic Zod validation** - Runs IMMEDIATELY in survey-generation Step 7 to verify schema correctness (MANDATORY)
3. **survey-hosted skill** (this skill, auto-triggered) - Verifies hosted routes work with the pre-validated schema

### Data Flow

1. Survey-generation updates schema in `app/data/`
2. Hosted routes at `app/app/survey/*` read the updated schema
3. Respondents take the survey using hosted experience
4. Responses are collected and stored in localStorage
5. Both authoring and hosted views use the same boilerplate app

### Theme Consistency

Both skills use the **exact same theme** from `app/app/globals.css` for consistency. The authoring view (`app/app/page.tsx`) and respondent experience (`app/app/survey/*`) are visually aligned (same colors, fonts, spacing, components).

---

# Final Step: Start Development Server

**IMPORTANT:** After completing ALL work for both survey-generation and survey-hosted skills, start the development server:

### Action Required:

**CRITICAL: Check if server is already running BEFORE starting:**

```bash
# Check if port 3001 is already in use
lsof -ti:3001

# If the command returns a process ID:
# → Server is already running - DO NOT start again, DO NOT kill the process

# If the command returns nothing:
# → Server is not running - start it now:
cd app
PORT=3001 npm run dev
```

### When to Execute:

- ✅ Execute this step **ONLY AFTER** both skills have completed all their tasks
- ✅ This is the final step of the survey implementation workflow
- ✅ **NEVER kill port 3001 if it's already running** - the server is already available

### Important Rules:

- ✅ Always check if port 3001 is running first: `lsof -ti:3001`
- ❌ **DO NOT kill the port** if server is already running
- ❌ **DO NOT restart** a running server unnecessarily
- ✅ Only start if port 3001 is free

### ⚠️ CRITICAL - User Communication Guidelines:

**NEVER mention to the user:**

- ❌ Port numbers (e.g., "port 3001", "3001")
- ❌ localhost URLs (e.g., "localhost:3001", "http://localhost")
- ❌ Server status (e.g., "server is running on")
- ❌ Technical setup details
- ❌ Command line instructions

**ALWAYS communicate:**

- ✅ "The survey is ready for preview"
- ✅ "The survey has been generated successfully"
- ✅ "You can now test the survey"
- ✅ Keep responses simple and non-technical
