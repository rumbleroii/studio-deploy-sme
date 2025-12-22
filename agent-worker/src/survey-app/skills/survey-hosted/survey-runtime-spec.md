# Survey Runtime Specification

This document defines the complete architecture and behavior of the hosted survey runtime - the actual survey that respondents take.

---

## 🎯 Purpose

Define how surveys are rendered and experienced by respondents, including:
- Screen-by-screen navigation
- Real-time logic evaluation
- Response collection and persistence
- Progress tracking
- Validation and error handling

---

## 🏗️ Architecture Overview

### High-Level Flow
```
Respondent → Survey Link → Welcome Screen → Question Screens → Thank You Screen
                                ↓              ↓                    ↓
                           Start Survey    Save Responses      Mark Complete
                                              ↓
                                      Evaluate Logic
                                      (Skip, Show/Hide, Branch)
```

### Component Architecture
```
SurveyRuntime
├── WelcomeScreen
│   ├── SurveyTitle
│   ├── WelcomeMessage
│   └── StartButton
├── QuestionScreen
│   ├── ProgressIndicator
│   ├── QuestionRenderer
│   │   ├── QuestionText
│   │   ├── QuestionInput (Radio/Checkbox/Text/Matrix/etc.)
│   │   └── ValidationMessage
│   └── NavigationButtons
│       ├── PreviousButton
│       └── NextButton
└── ThankYouScreen
    ├── CompletionMessage
    └── AdditionalInfo (optional)
```

---

## 📱 Screen Specifications

### 1. Welcome Screen

**Purpose**: Introduce survey and allow respondent to start

**Route**: `/s/[surveyId]`

**Structure**:
```tsx
<WelcomeScreen>
  <Container maxWidth="800px" padding="40px">
    <SurveyTitle>{survey.title}</SurveyTitle>
    <WelcomeMessage>
      {survey.welcomeMessage || defaultWelcomeMessage}
    </WelcomeMessage>
    <SurveyMetadata>
      <EstimatedTime>~{survey.estimatedMinutes} minutes</EstimatedTime>
      <QuestionCount>{survey.totalQuestions} questions</QuestionCount>
    </SurveyMetadata>
    <StartButton onClick={handleStart}>
      Start Survey
    </StartButton>
  </Container>
</WelcomeScreen>
```

**Styling** (from `../shared/survey-ui-theme.md`):
```css
.welcome-screen {
  background: #FFFFFF;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.survey-title {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  text-align: center;
  margin-bottom: 24px;
}

.welcome-message {
  font-size: 16px;
  font-weight: 400;
  color: #666666;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 32px;
  max-width: 600px;
}

.start-button {
  background: #3D1C35;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  padding: 14px 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.start-button:hover {
  background: #C2185B;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(233, 30, 99, 0.3);
}
```

**Behavior**:
- Display survey title and welcome message
- Show estimated time and question count
- "Start Survey" button initiates survey
- On click: Navigate to first question, create survey response record

**Default Welcome Message**:
```
Thank you for taking the time to complete this survey. Your responses are 
valuable and will help us better understand your opinions and preferences. 
This survey should take approximately [X] minutes to complete. All responses 
are anonymous and confidential.
```

---

### 2. Question Screen

**Purpose**: Display one question (or multiple if specified) and collect response

**Route**: `/s/[surveyId]/question/[questionId]`

**Structure**:
```tsx
<QuestionScreen>
  <Container maxWidth="800px" padding="40px">
    <ProgressIndicator 
      current={currentQuestionIndex} 
      total={totalQuestions} 
    />
    
    <QuestionContainer>
      <QuestionText>{question.text}</QuestionText>
      
      <QuestionInput
        type={question.type}
        options={question.options}
        value={responses[question.id]}
        onChange={handleResponseChange}
        error={validationError}
      />
      
      {validationError && (
        <ValidationMessage>{validationError}</ValidationMessage>
      )}
    </QuestionContainer>
    
    <NavigationButtons>
      {!isFirstQuestion && (
        <PreviousButton onClick={handlePrevious}>
          Previous
        </PreviousButton>
      )}
      
      <NextButton onClick={handleNext}>
        {isLastQuestion ? 'Submit' : 'Next'}
      </NextButton>
    </NavigationButtons>
  </Container>
</QuestionScreen>
```

**Styling** (from `../shared/survey-ui-theme.md`):
```css
.question-screen {
  background: #FFFFFF;
  min-height: 100vh;
  padding: 40px 0;
}

.progress-indicator {
  margin-bottom: 32px;
}

.question-container {
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 32px;
}

.question-text {
  font-size: 18px;  /* Slightly larger for readability */
  font-weight: 500;
  color: #1A1A1A;
  line-height: 1.6;
  margin-bottom: 24px;
}

.question-input {
  margin-bottom: 16px;
}

.validation-message {
  color: #D32F2F;
  font-size: 14px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.navigation-buttons {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.previous-button {
  background: #FFFFFF;
  border: 1px solid #BDBDBD;
  color: #1A1A1A;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.previous-button:hover {
  background: #F5F5F5;
  border-color: #999999;
}

.next-button {
  background: #3D1C35;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  margin-left: auto;
}

.next-button:hover {
  background: #C2185B;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(233, 30, 99, 0.3);
}

.next-button:disabled {
  background: #BDBDBD;
  cursor: not-allowed;
  transform: none;
}
```

**Behavior**:
- Display current question(s)
- Show progress indicator
- Collect response via appropriate input type
- Validate response on Next click
- Auto-save response on change (debounced)
- Navigate to previous question on Previous click
- Evaluate logic and navigate to next question on Next click
- Show Submit button on last question

---

### 3. Thank You Screen

**Purpose**: Confirm survey completion and thank respondent

**Route**: `/s/[surveyId]/complete`

**Structure**:
```tsx
<ThankYouScreen>
  <Container maxWidth="800px" padding="40px">
    <CompletionIcon>✓</CompletionIcon>
    <ThankYouTitle>Thank You!</ThankYouTitle>
    <ThankYouMessage>
      {survey.thankYouMessage || defaultThankYouMessage}
    </ThankYouMessage>
    {survey.redirectUrl && (
      <RedirectInfo>
        Redirecting in {countdown} seconds...
      </RedirectInfo>
    )}
  </Container>
</ThankYouScreen>
```

**Styling**:
```css
.thank-you-screen {
  background: #FFFFFF;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.completion-icon {
  width: 80px;
  height: 80px;
  background: #4CAF50;
  color: #FFFFFF;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin: 0 auto 24px;
}

.thank-you-title {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 16px;
}

.thank-you-message {
  font-size: 16px;
  font-weight: 400;
  color: #666666;
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}
```

**Behavior**:
- Display completion confirmation
- Show thank you message
- Mark survey response as completed
- Optional: Redirect after countdown
- Prevent back navigation

**Default Thank You Message**:
```
Your responses have been recorded. We appreciate your time and valuable 
feedback. Your input will help us improve our products and services.
```

---

## 🔄 Navigation Flow

### Question Navigation Logic

```typescript
async function handleNext() {
  // 1. Validate current response
  const validationError = validateResponse(
    currentQuestion,
    responses[currentQuestion.id]
  );
  
  if (validationError) {
    setError(validationError);
    return;
  }
  
  // 2. Save response
  await saveResponse(currentQuestion.id, responses[currentQuestion.id]);
  
  // 3. Evaluate logic to determine next question
  const nextQuestionId = evaluateLogic(
    currentQuestion,
    responses[currentQuestion.id],
    responses,
    surveySchema
  );
  
  // 4. Navigate
  if (nextQuestionId === null) {
    // Survey complete
    await markSurveyComplete();
    router.push(`/s/preview/complete`);
  } else if (nextQuestionId === 'TERMINATE') {
    // Early termination
    await markSurveyTerminated();
    router.push(`/s/preview/terminate`);
  } else {
    // Next question
    router.push(`/s/preview}/question/${nextQuestionId}`);
  }
}

async function handlePrevious() {
  // 1. Get previous question from history
  const previousQuestionId = getPreviousQuestion(visitedQuestions);
  
  // 2. Navigate back
  if (previousQuestionId) {
    router.push(`/s/preview/question/${previousQuestionId}`);
  } else {
    // Back to welcome screen
    router.push(`/s/preview`);
  }
}
```

### Questions Per Screen

**Default**: 1 question per screen

**Multiple Questions Per Screen**: If specified in questionnaire metadata
```json
{
  "questionId": "Q1",
  "groupWith": ["Q2", "Q3"],
  "displayMode": "grouped"
}
```

When grouped:
- Display all questions in group on same screen
- Validate all before allowing Next
- Save all responses together
- Show combined progress

---

## 💾 State Management

### Survey State Structure

```typescript
interface SurveyRuntimeState {
  // Survey metadata
  surveyId: string;
  surveySchema: Survey;
  responseId: string;
  
  // Progress tracking
  currentQuestionId: string;
  visitedQuestions: string[];
  totalQuestions: number;
  answeredQuestions: number;
  progress: number; // 0-100
  
  // Response data
  responses: Record<string, any>;
  timestamps: Record<string, Date>;
  
  // Session info
  startedAt: Date;
  lastSavedAt: Date;
  completedAt?: Date;
  
  // UI state
  isLoading: boolean;
  isSaving: boolean;
  validationErrors: Record<string, string>;
  
  // Device info
  deviceInfo: {
    userAgent: string;
    screenSize: string;
    isMobile: boolean;
  };
}
```

### State Persistence

**Auto-save**: Save responses automatically on change (debounced 500ms)

**Storage**:
- Server: Database (primary)
- Client: LocalStorage (backup)

**Recovery**:
- On page refresh: Restore from server
- On connection loss: Queue saves, sync when reconnected
- On browser close: Save to LocalStorage

```typescript
// Auto-save hook
function useAutoSave(questionId: string, response: any) {
  const debouncedSave = useMemo(
    () => debounce(async (qId, resp) => {
      await saveResponse(qId, resp);
      setLastSavedAt(new Date());
    }, 500),
    []
  );
  
  useEffect(() => {
    if (response !== undefined) {
      debouncedSave(questionId, response);
    }
  }, [response, questionId, debouncedSave]);
}
```

---

## 🎨 Theme Application

**CRITICAL**: Use exact same theme as questionnaire view

### Theme Reference
All styling MUST match `../shared/survey-ui-theme.md`:
- Colors: Same hex values
- Fonts: Same sizes and weights
- Spacing: Same pixel values
- Components: Same styling (radio, checkbox, inputs, etc.)

### Differences from Questionnaire View
- **Hide**: Question ID badges, type badges, metadata badges, notes sections
- **Show**: Progress indicator, navigation buttons
- **Adjust**: Slightly larger question text (18px vs 15px) for better readability
- **Simplify**: Remove section headers, show seamless flow

### Component Reuse
Reuse these components from questionnaire view:
- Radio buttons (20px, same styling)
- Checkboxes (20px, same styling)
- Text inputs (same styling)
- Dropdowns (same styling)
- Matrix tables (same styling)

---

## 📊 Progress Tracking

### Progress Bar

**Display**: Top of every question screen

**Calculation**:
```typescript
const progress = (answeredQuestions / totalQuestions) * 100;
```

**Styling**:
```css
.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 16px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3D1C35 0%, #3D1C35 100%);
  transition: width 0.3s ease-in-out;
}

.progress-text {
  font-size: 14px;
  color: #666666;
  text-align: center;
  margin-top: 8px;
}
```

**Display Options**:
1. **Bar only**: Visual progress bar
2. **Bar + Percentage**: "50% complete"
3. **Bar + Count**: "Question 5 of 10"
4. **Bar + Both**: "Question 5 of 10 (50%)"

---

## ✅ Validation

### Validation Rules

**Required Fields**:
```typescript
if (question.required && !response) {
  return "This question is required";
}
```

**Format Validation**:
```typescript
if (question.validation?.type === 'email') {
  if (!isValidEmail(response)) {
    return "Please enter a valid email address";
  }
}
```

**Range Validation**:
```typescript
if (question.validation?.min !== undefined) {
  if (response < question.validation.min) {
    return `Value must be at least ${question.validation.min}`;
  }
}
```

### Error Display

**Inline Errors**: Show below question input
```tsx
{validationError && (
  <div className="validation-message">
    <ErrorIcon />
    {validationError}
  </div>
)}
```

**Prevent Navigation**: Disable Next button until valid
```tsx
<NextButton 
  onClick={handleNext}
  disabled={!!validationError || !hasResponse}
>
  Next
</NextButton>
```

---

## 📱 Responsive Behavior

### Desktop (1024px+)
- Max width: 800px, centered
- Full navigation buttons
- Progress bar at top

### Tablet (768px - 1023px)
- Reduce padding to 24px
- Maintain button sizes
- Progress bar at top

### Mobile (<768px)
- Reduce padding to 16px
- Larger touch targets (48px minimum)
- Stack navigation buttons if needed
- Sticky navigation buttons at bottom
- Progress bar at top

```css
@media (max-width: 767px) {
  .question-screen {
    padding: 16px;
  }
  
  .question-container {
    padding: 24px 16px;
  }
  
  .navigation-buttons {
    position: sticky;
    bottom: 0;
    background: #FFFFFF;
    padding: 16px;
    border-top: 1px solid #E0E0E0;
    margin: 0 -16px;
  }
  
  .previous-button,
  .next-button {
    min-height: 48px;
    flex: 1;
  }
}
```

---

## 🔐 Security & Privacy

### Response Privacy
- No personally identifiable information in URLs
- Use secure response IDs
- Encrypt sensitive data
- HTTPS only

### Rate Limiting
- Prevent spam submissions
- Limit by IP address
- Fingerprinting for anonymous surveys

### Data Protection
- Auto-save with encryption
- Secure transmission (HTTPS)
- GDPR compliance
- Data retention policies

---

## 📈 Analytics & Tracking

### Track These Metrics
- Survey starts
- Survey completions
- Completion rate
- Average time per question
- Average total time
- Drop-off points
- Device types
- Browser types

### Implementation
```typescript
// Track question view
trackEvent('question_viewed', {
  surveyId,
  questionId,
  questionIndex,
  timestamp: new Date()
});

// Track question answer
trackEvent('question_answered', {
  surveyId,
  questionId,
  timeSpent: Date.now() - questionStartTime,
  timestamp: new Date()
});

// Track completion
trackEvent('survey_completed', {
  surveyId,
  totalTime: Date.now() - surveyStartTime,
  questionCount: totalQuestions,
  timestamp: new Date()
});
```

---

## 🎯 Performance Optimization

### Page Load
- Pre-fetch next question
- Lazy load images
- Minimize JavaScript bundle
- Use server components where possible

### Navigation
- Optimistic UI updates
- Instant page transitions
- Background save operations
- Cache survey schema

### Implementation
```typescript
// Pre-fetch next question
useEffect(() => {
  const nextQuestionId = getNextQuestionId(currentQuestion);
  if (nextQuestionId) {
    router.prefetch(`/s/${surveyId}/question/${nextQuestionId}`);
  }
}, [currentQuestion]);
```

---

## ♿ Accessibility

### Keyboard Navigation
- Tab through all inputs
- Enter to submit
- Escape to cancel
- Arrow keys for radio/checkbox groups

### Screen Reader Support
- ARIA labels on all inputs
- Progress announcements
- Error announcements
- Focus management

### Implementation
```tsx
<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
  {progress}% complete
</div>

<div role="alert" aria-live="polite">
  {validationError}
</div>
```

---

## 🧪 Testing Requirements

### Unit Tests
- Logic evaluation
- Validation rules
- State management
- Navigation logic

### Integration Tests
- Complete survey flow
- Skip logic paths
- Validation scenarios
- Save/restore functionality

### E2E Tests
- Full survey completion
- Back button functionality
- Mobile responsiveness
- Error handling

---

## Related Documentation

- **Theme**: `../shared/survey-ui-theme.md` - **USE THIS FOR ALL STYLING**
- **Navigation**: `survey-navigation-spec.md`
- **State**: `survey-state-management.md`
- **Routes**: `survey-routes-spec.md`
- **Logic**: `survey-logic-evaluation.md`
- **Validation**: `survey-validation-spec.md`

