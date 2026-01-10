---
name: survey-generation
description: Generates consistent, professionally formatted survey UIs from uploaded questionnaires using the existing Next.js app at app as boilerplate. Use when the user uploads a questionnaire document (Word, PDF, text) and asks to create or generate a survey. NEVER creates apps from scratch - always modifies the existing boilerplate. Updates survey schema in app/data/, modifies components if needed, maintains exact theme specifications. After completing generation, AUTOMATICALLY triggers survey-hosted skill. Keyword triggers - questionnaire, survey generation, create survey, format survey, parse questionnaire, create survey UI, update survey.
---

# Survey Generation Skill

## Purpose

This skill ensures **100% consistent survey UI generation** from any uploaded questionnaire by using the existing Next.js application at `app` as boilerplate code. Every generated survey will have identical theme, structure, components, and formatting because they all use the same base application.

## Boilerplate Application

**CRITICAL:** Always use the existing Next.js app at `app` as the foundation:

- **Location:** `app/` directory
- **Never create from scratch:** Always modify existing files
- **Survey data:** Add/update files in `app/data/`
- **Components:** Reuse existing components in `app/components/`
- **Routes:** Use existing routes in `app/app/`
- **Theme:** Already implemented in `app/app/globals.css`

## When to Use This Skill

Use this skill when the user:

- Uploads a questionnaire file (Word, PDF, text, etc.)
- Asks to "generate a survey" or "create a survey UI"
- Wants to "parse" or "format" a questionnaire
- Mentions "questionnaire" and "survey" together
- Requests a survey authoring or design view

## 🚨 CRITICAL: Read ALL Files in /skill Folder Before Coding

**MANDATORY REQUIREMENT - DO NOT SKIP:**

**IMPORTANT: Read files SILENTLY and INTERNALLY. Do NOT explain what you're reading to the user. Just read, understand, then build directly.**

Before writing ANY code or making ANY changes, you MUST:

1. **Read the questionnaire file completely** - Understand all questions, logic, and requirements

2. **Read ALL documentation files in the `.opencode/skill/` folder:**
   - `survey-generation/` - All generation guides and checklists
   - `shared/` - ALL shared specifications (question types, validation, logic, matrix, other-options, etc.)
   - `survey-hosted/` - Runtime and implementation specs
   - **DO NOT skip any .md files** - They all contain critical information

3. **Read existing implementation files:**
   - `data/sample-survey.ts` - See the correct schema format
   - `types/survey.ts` - Understand the TypeScript types (this is the source of truth)
   - `components/QuestionRenderer.tsx` - See what's already implemented

4. **Verify consistency:**
   - Check that documentation matches `types/survey.ts` (TypeScript types are always correct)
   - If documentation contradicts implementation, **follow the implementation**
   - Note any mismatches and use correct patterns

**COMMUNICATION RULE:**
- ❌ **DO NOT** tell the user "I'm reading the questionnaire..." or "I found X questions..."
- ❌ **DO NOT** explain what files you're reading or what you discovered
- ✅ **DO** read files silently, then immediately start building
- ✅ **DO** say "Working on this..." or "This will take a moment..." then build
- ✅ **DO** only communicate when the survey is complete: "Done! Your survey has X questions."

**WHY THIS IS CRITICAL:**

- ❌ Rushing to code without reading ALL skills = schema mismatches and errors
- ❌ Missing ONE file means missing critical patterns (e.g., "Other" option metadata structure)
- ❌ Using wrong type names (e.g., `type: "numeric_input"` instead of `type: "numeric"`)
- ❌ Putting properties in wrong places (e.g., `hasOtherOption` on option vs metadata)
- ❌ Incorrect validation structure (e.g., array vs object)
- ✅ Reading ALL files first ensures you understand the COMPLETE system before changing anything

**If you start coding without reading ALL skill files first, the generated survey WILL have errors.**

**Time spent reading = Zero errors. Time saved by skipping = Hours debugging.**

---

## ⚠️ User Communication Guidelines

**NEVER mention to the user:**

- ❌ Port numbers (e.g., "port 3001", "running on 3001")
- ❌ localhost URLs (e.g., "localhost:3001", "http://localhost")
- ❌ Server technical details (e.g., "server is running on", "visit http://")
- ❌ Command line instructions or technical setup

**ALWAYS communicate:**

- ✅ "The survey is ready for preview"
- ✅ "Survey generation is complete"
- ✅ "You can now test the survey"
- ✅ Keep all responses simple and non-technical

---

## Instructions

### Step 1: Understand the Boilerplate Application

**ALWAYS work with the existing `app` application:**

Reference the boilerplate structure:

```
app/
├── app/
│   ├── page.tsx                    # Authoring view
│   ├── globals.css                 # THEME (preserve exactly)
│   └── survey/                  # Hosted survey routes
├── components/                      # Reusable components
│   ├── Badge.tsx, QuestionCard.tsx, QuestionRenderer.tsx, etc.
├── data/                           # Survey schemas
│   ├── sampleSurveyWithLogic.ts   # Reference this format
│   └── sample-survey.ts           # Reference this format
├── lib/, types/, utils/            # Supporting code
```

### Step 2: Apply Exact Theme Specifications

**CRITICAL:** Theme is implemented in `app/app/globals.css`. Never modify theme colors, fonts, or spacing.

**Theme (../shared/survey-ui-theme.md):**

- Colors: #3D1C35 (badges), #1A1A1A (text), #666666 (secondary), #E0E0E0 (borders), #E0BFD8 (notes/show conditions)
- Fonts: 32px title, 16px section, 15px question, 14px option, 11px badge
- Spacing: 40px page padding, 24px section padding, 20px question padding, 8px option gap
- Components: 20px radio/checkbox, 8px border radius, 4px badge radius

**Structure (survey-structure-spec.md):**

- Page header with title (32px bold)
- Objectives section with bullet points (14px gray)
- Audience section with sample size and quotas
- Collapsible sections with question counts
- Questions with ID badges (maroon #3D1C35) and type badges (gray #F5F5F5)
- Metadata row with logic badges (color-coded: #3D1C35 for primary, #E0BFD8 for show conditions)
- Notes sections (light maroon background #E0BFD8, maroon border #3D1C35)

**Components (../shared/survey-components-spec.md):**

- Badge components (7 types with specific colors)
- Input components (radio, checkbox, text, dropdown)
- Section and question containers
- Matrix/grid components

**Question Types (../shared/survey-question-types.md):**

- All 20+ question types with exact formats
- Introduction screens, single choice, multiple choice, matrix, text, etc.
- Validation rules and formatting

**Logic (../shared/survey-logic-spec.md):**

- Display logic badges (show/hide conditions)
- Navigation logic badges (skip logic, conditional routing)
- Randomization logic badges
- Dynamic options badges
- Color-coded by type

### Step 3: Parse Questionnaire and Create Survey Schema

When user uploads a questionnaire:

**IMPORTANT - Questionnaire Location:**

- User-uploaded questionnaires are stored in the `user_files` directory
- Always look for questionnaire files in `user_files/` when the user mentions they uploaded a document
- Common file types: `.md` (PRIORITIZE), `.doc`, `.docx`, `.pdf`, `.txt`
- **Check for .md files FIRST** - questionnaires are often converted to markdown!
- If the user says "I uploaded a questionnaire", check `user_files/` for the most recent file

**Processing Steps:**

1. **Parse the questionnaire** from `user_files/` directory to extract all elements
2. **Follow complete-generation-checklist.md** - CRITICAL to avoid missing questions
3. **Detect piping patterns** - Questionnaires use various formats (see below)
4. **Read existing schema files** in `app/data/` for format reference
5. **update existing sample-survey.ts file** in `app/data/sample-survey.ts`
6. **Follow exact TypeScript structure** from existing schemas
7. **Include all**: metadata, sections, questions, options, logic, notes

**CRITICAL - No Extra Questions:**

- **NEVER add questions that are not in the uploaded questionnaire**
- **Only generate questions that exist in the source document**
- **Do NOT add introductions, thank you screens, or demographic questions unless they are in the questionnaire**
- **Do NOT add validation questions, attention checks, or test questions unless specified**
- **Every question must have a direct source in the uploaded file**

**CRITICAL - Question Type Verification:**

- **ALWAYS verify the correct question type** before generating
- **Rating questions** (1-5, 1-7 scales) must use `ratingScale` type, NOT `multipleChoice`
- **NPS questions** (0-10 scales) must use `slider` type, NOT `ratingScale`
- **"Select all that apply"** must use `multipleChoice`, NOT `singleChoice`
- **Single selection** must use `singleChoice`, NOT `multipleChoice`
- **Common error**: Generating rating scales as multiple choice - AVOID THIS

**CRITICAL - Exclusive Options (Multiple Choice):**

- **Identify exclusive options** in questionnaires: "None of the above", "Prefer not to answer", "Not applicable", "I don't use any of these". Or questionnare mentions which option is [EXCLUSIVE].
- **Add to schema**: Include option as regular option with numeric ID, then add ID to `metadata.exclusiveOptions: [optionId]`
- **Example**:
  ```typescript
  {
    type: "multiple_choice",
    options: [
      { id: 1, label: "Option A", value: "a" },
      { id: 99, label: "None of the above", value: "none" }
    ],
    metadata: {
      exclusiveOptions: [99]  // Use option ID (number), not value (string)
    }
  }
  ```
- **Behavior**: Selecting exclusive option deselects all others; selecting regular option deselects exclusive
- **See**: `complete-generation-checklist.md` Section "Multiple Choice with Exclusive Options" for full details

**CRITICAL - "Other (Please Specify)" Options:**

- **Identify "Other" options** in questionnaires: "Other (please specify)", "Other, please describe", "Other:", etc.
- **Add to schema**: Include option with numeric ID and configure metadata
- **Example**:
  ```typescript
  {
    type: "multiple_choice", // or "single_choice"
    options: [
      { id: 1, label: "Option A", value: "a" },
      { id: 2, label: "Option B", value: "b" },
      { id: 99, label: "Other (please specify)", value: "other" }
    ],
    metadata: {
      hasOtherOption: true,
      otherOptionId: 99,  // Must match the option ID above
      otherInputRequired: true,  // Default: true. User must enter text when "Other" is selected
      otherInputPlaceholder: "Please specify",  // Optional placeholder
      otherInputMaxLength: 100  // Optional max length
    }
  }
  ```
- **Validation**: When "Other" is selected, user MUST enter text in the textbox before proceeding (enforced automatically)
  - Validation runs when user clicks "Next" button
  - If text is missing/empty → Error message: "Please enter your answer in the text box when selecting 'Other (please specify)'"
  - User cannot proceed until valid text is entered
- **Storage**: Text is stored separately as `${questionId}_other_${optionValue}` in responses

**CRITICAL - Validation Based on Expected Answer:**

- **ALWAYS add appropriate validation** based on expected answer type
- **Numeric questions** (age, quantity, year) → Add `inputType: "number"`, `min`, `max`, numeric pattern
- **Email questions** → Add `inputType: "email"`, email pattern
- **Phone questions** → Add `inputType: "tel"`, phone pattern, length constraints
- **URL questions** → Add `inputType: "url"`, URL pattern
- **Text questions** → Add `minLength`, `maxLength`, `rejectWhitespaceOnly: true`
- **Free text** → Add `minLength` (e.g., 10), `maxLength` (e.g., 500)
- **See** `../shared/survey-question-types.md` for complete validation examples

**CRITICAL - Zero Omissions:**

- **Use complete-generation-checklist.md** to ensure ALL questions are generated
- **Count questions** before and after generation - totals MUST match
- **For matrix questions**: Use ../shared/matrix-question-guide.md for correct structure
- **Never skip a question** - if unclear, generate as text question with note for review

**CRITICAL - Piping Pattern Detection:**

Questionnaires use different formats for text substitution. Detect and convert ALL to standard format:

- **Detect**: `{{Q1}}`, `{Q1}`, `[Q1]`, `<Q1>`, `$Q1$`, `INSERT Q1`, `PIPE Q1`, etc.
- **Convert to**: `[INSERT Q1]` (raw value) or `[INSERT Q1 LABEL]` (option label)
- **Examples**:
  - `"You said {{Q1}}"` → `"You said [INSERT Q1]"`
  - `"You selected {Q5 option}"` → `"You selected [INSERT Q5 LABEL]"`
  - `"Total: $Q4 sum$"` → `"Total: $[INSERT Q4.SUM]"`
- **See**: `survey-generation-guide.md` Section C1 for complete patterns
- **See**: `../shared/survey-logic-spec.md` Section 5 for comprehensive piping documentation
- **Works in**: Both questionnaire view (authoring) and respondent view automatically

**CRITICAL - Hidden Variables Detection:**

When parsing questionnaires, look for hidden/computed variables:

- **Explicit**: "Hidden Variable", "Computed Field", "URL Parameter", "Random Assignment"
- **Implicit**: Calculations shown to respondent, "Your total is $[CALCULATED]", URL tracking, A/B tests, timestamps

**Convert to schema and use with piping:**

```typescript
// In schema
hiddenVariables: [
  {
    id: "var_total",
    type: "computed",
    formula: "SUM(Q10.selected_prices)",
    computeOn: "Q10",
  },
];

// In question text
text: "Your total is $[INSERT VARIABLE.var_total]. Does this work?";
```

- **See**: `../shared/survey-logic-spec.md` Section 6 for complete specification (types, formulas, examples)
- **IMPORTANT**: String-based conditions in hidden variables are NOT auto-evaluated. See Section 11 in survey-logic-spec.md

**CRITICAL - Sum-to-100% Validation:**

When questionnaire specifies "MUST SUM TO 100%", use `sumValidation`:

```typescript
{
  id: 'Q5',
  type: 'numeric',
  text: 'Percentage from publisher?',
  metadata: {
    suffix: '%',
    sumValidation: {
      targetSum: 100,
      linkedQuestionIds: ['Q5', 'Q5b'],
      errorMessage: 'Values must sum to 100%'
    }
  }
}
```

- **See**: `../shared/survey-logic-spec.md` Section 7 for complete details

**CRITICAL - Same Screen Questions:**

When questionnaire specifies "show on same screen as Q[X]", use `displayGroup`:

```typescript
{
  id: 'Q25',
  type: 'single_choice',
  text: 'Do you prefer spot or impressions?',
  metadata: { displayGroup: 'Q25-Q26' }
},
{
  id: 'Q26',
  type: 'text',
  text: 'Please explain why.',
  metadata: { displayGroup: 'Q25-Q26', inputType: 'textarea' }
}
```

- **See**: `../shared/survey-logic-spec.md` Section 8 for complete details

**CRITICAL - Option Tooltips:**

When questionnaire has hover-over explanations, use `tooltip`:

```typescript
{
  options: [
    {
      id: 1,
      label: 'Lack of Standardized Metrics',
      value: 'lack_metrics',
      tooltip: 'Inability to compare rates across platforms'
    }
  ]
}
```

- **See**: `../shared/survey-logic-spec.md` Section 9 for complete details

### Step 4: Update or Create Files in app

**You MAY:**

- Create new survey schema files in `app/data/`
- Update `app/app/page.tsx` to import and use new schema
- Create new components if absolutely necessary (rare)
- Add new pages/routes for different surveys

**You MUST:**

- Maintain ALL UI in sync with exact theme specifications
- Keep colors, fonts, spacing precisely as specified
- Never modify `app/app/globals.css` theme
- Reuse existing components in `app/components/`
- Follow existing patterns and structure

**You MUST NOT:**

- Change theme colors, fonts, or spacing
- Remove or alter theme specifications
- Create inconsistent UI elements
- Recreate the entire application from scratch

### Step 5: Verify Against Checklist

From `survey-generation-guide.md`, verify:

- [ ] Page title (32px, bold)
- [ ] Objectives section with bullets
- [ ] Audience section with sample size
- [ ] Collapsible sections with question counts
- [ ] Question ID badges (pink, 11px, uppercase)
- [ ] Question type badges (gray, 11px)
- [ ] Proper question formatting (15px)
- [ ] Correct input components (20px radio/checkbox)
- [ ] Logic badges in metadata row
- [ ] Notes sections where applicable (yellow background)
- [ ] Consistent spacing throughout
- [ ] Exact colors from specification

### Step 6: Start Development Server

**IMPORTANT - Internal Implementation Details (DO NOT mention to user):**

When starting the development server:

- **CRITICAL: Check if port 3001 is already running FIRST**
- If port 3001 is already in use, **DO NOT kill it** - the server is already running
- Only start the server if port 3001 is NOT in use: `PORT=3001 npm run dev`
- Never mention port numbers, localhost URLs, or technical details to the user

**Check if server is running:**

```bash
lsof -ti:3001
# If this returns a process ID, server is already running - DO NOT start again
# If this returns nothing, start the server: PORT=3001 npm run dev
```

**User Communication:**

- Simply confirm: "The survey is ready for preview"
- Do NOT mention: port numbers, localhost, URLs, technical setup details, or cache clearing
- Keep responses non-technical and user-friendly

#### Port Management Rules

- ✅ Always check if port 3001 is running first: `lsof -ti:3001`
- ❌ **DO NOT kill the port** if server is already running
- ❌ **DO NOT restart** a running server unnecessarily
- ✅ Only start if port 3001 is free

## API Integration

**IMPORTANT:** The survey app includes full API integration for production deployments.

### Overview

The hosted survey at `/survey/` submits responses to API endpoints **only in production mode**:

1. **POST /api/submit** - Called after EVERY question (Next button click) in production

   - Saves responses incrementally to database
   - Generates and returns `respondentId` on first submission
   - Tracks survey status: 'incomplete' | 'complete' | 'terminated'

2. **GET /api/health** - Health check for studio app
   - Verifies survey is live and accessible
   - Returns survey status, ID, timestamp, and version

### Environment Flag Behavior

```bash
NEXT_PUBLIC_DEPLOYMENT=development  # NO API calls
NEXT_PUBLIC_DEPLOYMENT=production   # API calls enabled
```

**What the flag controls:**

- **API submission** (disabled in development, enabled in production)
- **RespondentId tracking** (not tracked in development, tracked in production)
- **Database saves** (no database in development, saves in production)

**Note:** Back button is always visible in both development and production modes.

### RespondentId Management

**Production mode only:**

- Automatically generated on first submission
- Stored in localStorage for session persistence
- Sent with all subsequent API calls
- Cleared on survey completion or termination

**Development mode:**

- NOT tracked or stored
- Allows local testing without database requirements

### Implementation Details

All API functionality is consolidated in:

- `lib/api.ts` - All API functions
- `types/api.ts` - TypeScript types for API contracts
- `app/api/submit/route.ts` - POST endpoint
- `app/api/health/route.ts` - GET endpoint

For complete documentation, see `../survey-hosted/API-IMPLEMENTATION.md`.

## Key Files Reference

### Must Read First:

1. **../shared/user-files-spec.md** - User file locations and search patterns
2. **survey-generation-guide.md** - Step-by-step generation process
3. **QUICK-REFERENCE.md** - Quick lookup cheat sheet
4. **complete-generation-checklist.md** - CRITICAL: Ensures ALL questions are generated, zero omissions

### Skill-Specific:

5. **survey-structure-spec.md** - Layout and hierarchy for authoring view

### Shared Specifications (in ../shared/):

6. **../shared/survey-ui-theme.md** - Colors, fonts, spacing (EXACT values)
7. **../shared/survey-terminology-spec.md** - Professional language standards (MANDATORY)
8. **../shared/survey-components-spec.md** - Component specifications
9. **../shared/survey-question-types.md** - All question type formats
10. **../shared/survey-logic-spec.md** - Logic display and badges
11. **../shared/matrix-question-guide.md** - CRITICAL for matrix questions: Detailed guide to avoid generation failures
12. **../shared/other-option-spec.md** - "Other (please specify)" options with conditional text inputs
13. **../shared/advanced-features-spec.md** - Loop questions, per-column exclusivity, external metadata piping, real-time termination warnings

## Examples

### Example 1: User uploads Word document

**User:** "I've uploaded a questionnaire. Can you generate the survey UI?"

**Action:**

1. Check `user_files/` directory for the uploaded questionnaire file
2. Read the questionnaire file (e.g., `user_files/questionnaire.md` or `.docx`)
3. Parse questions, logic, and metadata from the questionnaire
4. Read existing schema format from `app/data/sampleSurveyWithLogic.ts`
5. Create new schema file in `app/data/[name]-survey.ts`
6. Update `app/app/page.tsx` to import and use new schema
7. Verify theme consistency with specifications

### Example 2: User asks to update existing survey

**User:** "Update the sample survey to add two more questions"

**Action:**

1. Read `app/data/sample-survey.ts`
2. Add the new questions to the schema
3. Maintain exact format and structure
4. Verify all theme specifications remain intact
5. Ensure components can render the updated schema

### Example 3: User wants to modify questions

**User:** "Change question Q5 to a matrix question instead of single choice"

**Action:**

1. Locate the survey schema in `app/data/`
2. Find question Q5 in the schema
3. Update question type and structure to matrix format
4. Reference matrix format from `../shared/survey-question-types.md`
5. Ensure QuestionRenderer component supports the change
6. Maintain all theme specifications

## Critical Requirements

### Always:

- Work within the existing `app/` directory (survey-app boilerplate)
- **Run dev server on port 3001 ONLY**: `HOSTNAME=0.0.0.0 PORT=3001 npm run dev`
- Use EXACT colors from specifications (no variations)
- Use EXACT font sizes (no approximations)
- Use EXACT spacing (no adjustments)
- Preserve `app/app/globals.css` theme exactly
- Reuse existing components from `app/components/`
- Create survey schemas in `app/data/`
- Include ALL required badges (ID, type, logic)
- Format ALL question types correctly
- Apply logic badges with correct colors (#3D1C35 primary, #E0BFD8 show conditions)
- Include notes sections (light maroon background #E0BFD8, maroon border #3D1C35)
- Use 20px radio buttons and checkboxes
- **MAINTAIN all performance optimizations** (lazy loading, code splitting, Suspense)
- Keep `app/next.config.js` optimization settings intact
- Use lazy loading for heavy components with Suspense fallbacks
- Add loading.tsx files for new routes
- **USE RESEARCH MANAGER TERMINOLOGY ONLY** - Never expose technical terms like "skip logic", "code logic", "variables" (see ../shared/survey-terminology-spec.md)
- **Preserve API integration** - Never remove or modify API calls in `/survey/question/page.tsx`
- Ensure `/api/submit` is called after every Next button click (only when `isProduction === true`)
- Maintain respondentId management via localStorage (production mode only)
- Keep environment flag checks around API submission logic (`if (isProduction)`)

### Never:

- Create applications from scratch (always use boilerplate)
- Modify `app/app/globals.css` theme
- Change colors, fonts, or spacing from specifications
- Omit question ID or type badges
- Skip metadata badges
- Use inconsistent formatting
- Deviate from specifications
- Make "creative" changes to theme or structure
- **Remove or modify performance optimizations** in next.config.js
- Remove lazy loading or Suspense wrappers from components
- Delete loading.tsx files or loading states
- Add heavy dependencies without dynamic imports
- **Remove or modify API integration** in hosted survey routes
- **Remove environment checks around API submission** (must check `isProduction` before calling APIs)
- Remove respondentId management from localStorage
- Call APIs in development mode (APIs should only be called when `isProduction === true`)
- **Kill port 3001 if the server is already running** - check first with `lsof -ti:3001`, do NOT kill if running
- Clear cache on every generation (only clear when user reports stale content)
- **Edit production files** - Never modify these core files:
  - `lib/mongodb.ts` - Database connection (auto-configured during deployment)
  - `lib/api.ts` - API utilities (production-ready)
  - `app/api/submit/route.ts` - Submit endpoint (production-ready)
  - `app/api/health/route.ts` - Health check endpoint (production-ready)
  - `types/api.ts` - API type definitions (production-ready)

## Cache Troubleshooting

**Proactive Cache Clearing Scenarios:**

Clear cache BEFORE starting server if making these types of changes:

- ✅ Major schema restructuring (adding/removing multiple questions)
- ✅ Changing question types or logic structure
- ✅ Modifying route patterns or navigation flow
- ✅ Updating core component interfaces

**Reactive Cache Clearing:**

- ✅ User reports changes not reflecting
- ✅ Old questions/content still visible after updates
- ✅ Browser refresh doesn't show new content

**Command:**

```bash
cd agent-worker/src/survey-app
rm -rf .next node_modules/.cache
PORT=3001 npm run dev
```

---

## Success Criteria

A successful survey generation means:

- New survey schema created in `app/data/`
- Schema follows exact format of existing schemas
- All questions, logic, metadata properly structured
- `app/app/page.tsx` updated (if needed)
- Existing components reused (not recreated)
- Theme preserved exactly (no changes to globals.css)
- All UI elements maintain exact theme specifications
- Looks identical to existing surveys (100% consistency)
- All badges present and correctly colored
- Logic displayed correctly with proper colors
- Notes sections included with correct styling

**Production Mode Additional Criteria:**

- [ ] `MONGODB_URI` configured in `.env.local` (if production mode)
- [ ] MongoDB is running and accessible
- [ ] Prisma client generated successfully
- [ ] Database connection verified (optional: `npx prisma db push`)
- [ ] API endpoints tested and responding correctly

## Supporting Files

This skill includes 13 supporting documentation files with ~8,000 lines of detailed specifications. Reference them as needed during generation.

### Advanced Features (CRITICAL for complex surveys)

When questionnaires include any of these patterns, reference `../shared/advanced-features-spec.md`:

- **Loop Questions**: Questionnaire shows "For each selected item in Q8A, ask Q9" or "Iterate through selections"
- **Per-Column Exclusivity**: Matrix has "Don't Know" that should clear only that column, not all rows
- **External Metadata Piping**: References like `[COUNTRY]`, `[CURRENCY]`, `[USER_SEGMENT]` that come from external data
- **Real-Time Termination Warnings**: Text fields that should warn users before termination logic triggers

## Sequential Workflow

**IMPORTANT:** After completing survey generation, this skill MUST automatically trigger the `survey-hosted` skill to implement the respondent experience.

### Complete Workflow:

1. **survey-generation skill** (this skill):

   - Parse uploaded questionnaire
   - Create survey schema in `app/data/`
   - Update `app/app/page.tsx` to use new schema
   - Reuse existing components from `app/components/`
   - Verify theme consistency

2. **survey-hosted skill** (auto-triggered next):
   - Update hosted survey routes in `app/app/survey/`
   - Ensure logic evaluation works with new schema
   - Verify navigation and state management
   - Confirm same theme applied throughout

### When to Trigger Sequential Workflow:

- User uploads questionnaire and asks to "create a survey"
- User asks to "create a survey UI"
- User mentions "generate survey" or "build survey"
- User wants both authoring view and respondent experience

### Example:

**User:** "Create a survey UI from this questionnaire"

**Action:**

1. Activate survey-generation skill → Create schema in `app/data/`, update app
2. Automatically activate survey-hosted skill → Verify hosted routes work with new schema
3. Deliver complete system with both authoring and respondent views
