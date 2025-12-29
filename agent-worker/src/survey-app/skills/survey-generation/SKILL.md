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

## Instructions

### Step 1: Understand the Boilerplate Application

**ALWAYS work with the existing `app` application:**

Reference the boilerplate structure:

```
app/
├── app/
│   ├── page.tsx                    # Authoring view
│   ├── globals.css                 # THEME (preserve exactly)
│   └── s/preview/                  # Hosted survey routes
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
5. **Create new survey schema file** in `app/data/[survey-name]-survey.ts`
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
- **Works in**: Both questionnaire view (authoring) and respondent view automatically

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

**CRITICAL: Always run on port 3000**

When starting the development server or testing the survey:

#### Port Management Rules

1. **Default Port**: Always use port 3000
2. **Handle Conflicts**: If port 3000 is in use, kill the existing process first
3. **No Alternatives**: Never use ports like 3001, 3002, etc.

#### Starting Process

**Standard sequence:**
```bash
# Step 1: Check if port 3000 is in use
lsof -ti:3000

# Step 2: If a process exists, kill it
kill -9 $(lsof -ti:3000)

# Step 3: Start dev server on port 3000
npm run dev
```

**Quick command** (handles all steps):
```bash
# Kill any process on 3000 and start dev server
lsof -ti:3000 && kill -9 $(lsof -ti:3000) || true && npm run dev
```

#### Common Scenarios

**Scenario 1: Port Already in Use**
```bash
# Error: Port 3000 is already in use
# Solution: Kill and restart
kill -9 $(lsof -ti:3000) && npm run dev
```

**Scenario 2: Starting Fresh**
```bash
# Clean start with port check
lsof -ti:3000 && kill -9 $(lsof -ti:3000) || true
npm run dev
```

**Scenario 3: Multiple Terminal Sessions**
- If dev server is in another terminal, kill it first
- Use: `kill -9 $(lsof -ti:3000)`
- Then start new instance

#### Why Port 3000?

- **Consistency**: All URLs and references use port 3000
- **Standard**: Default Next.js development port
- **Preview URLs**: Configured for localhost:3000
- **Testing**: Test scripts expect port 3000

#### Important Notes

- **Never modify** the default port in `next.config.js` or `.env`
- **Always kill** existing processes before starting new ones
- **Port 3000 is mandatory** for local development
- **Consistency matters** for URL references and testing

#### Troubleshooting

**Port still shows as in use:**
```bash
# Force kill with sudo (use cautiously)
sudo lsof -ti:3000 | xargs kill -9

# Or find specific process
lsof -i:3000
# Then kill by PID: kill -9 <PID>
```

**Prisma issues:**
```bash
# Regenerate Prisma client
npx prisma generate

# Then start dev server
npm run dev
```

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
13. **../shared/performance-optimization-spec.md** - Performance optimizations (MANDATORY)

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

## Supporting Files

This skill includes 12 supporting documentation files with ~7,000 lines of detailed specifications. Reference them as needed during generation.

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
   - Update hosted survey routes in `app/app/s/preview/`
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
