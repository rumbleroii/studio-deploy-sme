# Survey Implementation Guide

**Step-by-step guide for implementing the hosted survey experience.**

---

## 🎯 Goal

Implement a complete hosted survey system where respondents can:
1. Start a survey from a welcome screen
2. Answer questions one at a time (or multiple per screen if specified)
3. Navigate with Previous/Next buttons
4. See their progress
5. Complete the survey and see a thank you screen

**Theme**: Use EXACT same styling as questionnaire view (from `../shared/survey-ui-theme.md`)

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Questionnaire creation system working
- ✅ Survey schema defined (from questionnaire)
- ✅ Database setup for storing responses
- ✅ Next.js project structure
- ✅ Theme specifications (from `../shared/survey-ui-theme.md`)

---

## 🚀 Implementation Steps

### Step 1: Create Route Structure

**CRITICAL: Use the existing `../src/survey-app/app/s/preview/` route structure**

The boilerplate already has these routes:

```
../src/survey-app/app/s/preview/
├── page.tsx                    # Welcome screen
├── layout.tsx                  # Survey layout
├── question/page.tsx           # Question screens (uses ?q= query param)
├── complete/page.tsx           # Thank you screen
└── terminate/page.tsx          # Termination screen
```

**IMPORTANT ROUTING RULES:**
1. **ALWAYS use `/s/preview/` as the base route** for hosted surveys
2. **Welcome screen**: `/s/preview`
3. **Question screen**: `/s/preview/question?q={questionId}` (uses query parameter, not dynamic route)
4. **Complete screen**: `/s/preview/complete`
5. **Terminate screen**: `/s/preview/terminate`

**NEVER use:**
- ❌ `/s/${surveyId}/` routes (surveyId will be undefined)
- ❌ `/s/[surveyId]/question/[questionId]` (not the pattern we use)
- ❌ Dynamic surveyId in paths

**Navigation Examples:**
```typescript
// ✅ CORRECT
router.push(`/s/preview/question?q=${nextQuestionId}`);
router.push(`/s/preview/complete`);
router.push(`/s/preview/terminate`);

// ❌ WRONG - Don't use surveyId in path
router.push(`/s/${surveyId}/question?q=${nextQuestionId}`);
router.push(`/s/${surveyId}/complete`);
```

**Reference**: `survey-routes-spec.md` for complete implementation

---

### Step 2: Create Database Schema

Add tables for survey responses:

```prisma
// prisma/schema.prisma

model SurveyResponse {
  id            String   @id @default(cuid())
  surveyId      String
  surveyVersion Int
  respondentId  String?
  status        ResponseStatus @default(IN_PROGRESS)
  
  // Response data
  answers       Json     // Record<questionId, answer>
  visitedQuestions Json  // string[] - history of visited questions
  
  // Timing
  startedAt     DateTime @default(now())
  lastSavedAt   DateTime @updatedAt
  completedAt   DateTime?
  
  // Metadata
  deviceInfo    Json?
  ipAddress     String?
  userAgent     String?
  
  survey        Survey   @relation(fields: [surveyId], references: [id])
  
  @@index([surveyId])
  @@index([status])
}

enum ResponseStatus {
  IN_PROGRESS
  COMPLETED
  TERMINATED
  ABANDONED
}
```

Run migration:
```bash
npx prisma migrate dev --name add_survey_responses
```

---

### Step 3: Create API Routes

#### 3.1 Create Response API

**File**: `/src/app/api/surveys/[surveyId]/responses/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { surveyId: string } }
) {
  try {
    // Get survey
    const survey = await prisma.survey.findUnique({
      where: { id: params.surveyId },
    });
    
    if (!survey || !survey.published) {
      return NextResponse.json(
        { error: 'Survey not found' },
        { status: 404 }
      );
    }
    
    // Get device info
    const userAgent = request.headers.get('user-agent') || '';
    const deviceInfo = {
      userAgent,
      isMobile: /mobile/i.test(userAgent),
    };
    
    // Create response
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: params.surveyId,
        surveyVersion: survey.version,
        answers: {},
        visitedQuestions: [],
        deviceInfo,
        status: 'IN_PROGRESS',
      },
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to create response:', error);
    return NextResponse.json(
      { error: 'Failed to create response' },
      { status: 500 }
    );
  }
}
```

#### 3.2 Save Answer API

**File**: `/src/app/api/responses/[responseId]/answers/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: { responseId: string } }
) {
  try {
    const { questionId, answer } = await request.json();
    
    // Get current response
    const response = await prisma.surveyResponse.findUnique({
      where: { id: params.responseId },
    });
    
    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }
    
    // Update answers
    const answers = response.answers as Record<string, any>;
    answers[questionId] = answer;
    
    // Update response
    await prisma.surveyResponse.update({
      where: { id: params.responseId },
      data: {
        answers,
        lastSavedAt: new Date(),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save answer:', error);
    return NextResponse.json(
      { error: 'Failed to save answer' },
      { status: 500 }
    );
  }
}
```

#### 3.3 Get Next Question API

**File**: `/src/app/api/responses/[responseId]/next/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { evaluateNextQuestion } from '@/lib/survey/logic';

export async function POST(
  request: Request,
  { params }: { params: { responseId: string } }
) {
  try {
    const { currentQuestionId, answer } = await request.json();
    
    // Get response and survey
    const response = await prisma.surveyResponse.findUnique({
      where: { id: params.responseId },
      include: { survey: true },
    });
    
    if (!response) {
      return NextResponse.json(
        { error: 'Response not found' },
        { status: 404 }
      );
    }
    
    // Evaluate logic to get next question
    const nextQuestionId = evaluateNextQuestion(
      response.survey,
      currentQuestionId,
      answer,
      response.answers as Record<string, any>
    );
    
    // Update visited questions
    const visitedQuestions = response.visitedQuestions as string[];
    if (!visitedQuestions.includes(currentQuestionId)) {
      visitedQuestions.push(currentQuestionId);
      
      await prisma.surveyResponse.update({
        where: { id: params.responseId },
        data: { visitedQuestions },
      });
    }
    
    return NextResponse.json({ nextQuestionId });
  } catch (error) {
    console.error('Failed to get next question:', error);
    return NextResponse.json(
      { error: 'Failed to get next question' },
      { status: 500 }
    );
  }
}
```

---

### Step 4: Create Components

#### 4.1 Welcome Screen Component

**File**: `/src/components/survey/WelcomeScreen.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WelcomeScreenProps {
  survey: Survey;
}

export function WelcomeScreen({ survey }: WelcomeScreenProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  
  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      // Create response
      const res = await fetch(`/api/surveys/${survey.id}/responses`, {
        method: 'POST',
      });
      
      const response = await res.json();
      
      // Get first question
      const firstQuestionId = survey.questions[0].id;
      
      // Navigate to first question
      router.push(
        `/s/${survey.id}/question/${firstQuestionId}?responseId=${response.id}`
      );
    } catch (error) {
      console.error('Failed to start survey:', error);
      setIsStarting(false);
    }
  };
  
  return (
    <div className="welcome-screen">
      <div className="container">
        <h1 className="survey-title">{survey.title}</h1>
        
        <p className="welcome-message">
          Thank you for taking the time to complete this survey. Your responses 
          are valuable and will help us better understand your opinions and 
          preferences. This survey should take approximately {survey.estimatedMinutes} 
          minutes to complete. All responses are anonymous and confidential.
        </p>
        
        <div className="survey-metadata">
          <span>~{survey.estimatedMinutes} minutes</span>
          <span>{survey.totalQuestions} questions</span>
        </div>
        
        <button
          className="start-button"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? 'Starting...' : 'Start Survey'}
        </button>
      </div>
    </div>
  );
}
```

**Styling** (add to globals.css, using exact values from `../shared/survey-ui-theme.md`):

```css
.welcome-screen {
  background: #FFFFFF;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.welcome-screen .container {
  max-width: 800px;
  width: 100%;
  text-align: center;
}

.survey-title {
  font-size: 32px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 24px;
}

.welcome-message {
  font-size: 16px;
  font-weight: 400;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 32px;
}

.survey-metadata {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
  font-size: 14px;
  color: #666666;
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

.start-button:hover:not(:disabled) {
  background: #C2185B;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(233, 30, 99, 0.3);
}

.start-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### 4.2 Question Screen Component

**File**: `/src/components/survey/QuestionScreen.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressIndicator } from './ProgressIndicator';
import { QuestionRenderer } from './QuestionRenderer';
import { NavigationButtons } from './NavigationButtons';

interface QuestionScreenProps {
  survey: Survey;
  question: Question;
  response: SurveyResponse;
}

export function QuestionScreen({
  survey,
  question,
  response,
}: QuestionScreenProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState(response.answers[question.id]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (answer !== undefined && answer !== response.answers[question.id]) {
        await saveAnswer(answer);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [answer]);
  
  const saveAnswer = async (value: any) => {
    try {
      await fetch(`/api/responses/${response.id}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          answer: value,
        }),
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };
  
  const handleNext = async () => {
    // Validate
    if (question.required && !answer) {
      setError('This question is required');
      return;
    }
    
    setError(null);
    setIsSaving(true);
    
    try {
      // Save answer
      await saveAnswer(answer);
      
      // Get next question
      const res = await fetch(`/api/responses/${response.id}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentQuestionId: question.id,
          answer,
        }),
      });
      
      const { nextQuestionId } = await res.json();
      
      if (nextQuestionId === null) {
        // Survey complete
        router.push(`/s/${survey.id}/complete?responseId=${response.id}`);
      } else if (nextQuestionId === 'TERMINATE') {
        // Disqualified
        router.push(`/s/${survey.id}/terminate?responseId=${response.id}`);
      } else {
        // Next question
        router.push(
          `/s/${survey.id}/question/${nextQuestionId}?responseId=${response.id}`
        );
      }
    } catch (error) {
      console.error('Failed to proceed:', error);
      setError('Failed to save response. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrevious = () => {
    const visitedQuestions = response.visitedQuestions as string[];
    const currentIndex = visitedQuestions.indexOf(question.id);
    
    if (currentIndex > 0) {
      const previousQuestionId = visitedQuestions[currentIndex - 1];
      router.push(
        `/s/${survey.id}/question/${previousQuestionId}?responseId=${response.id}`
      );
    }
  };
  
  const showPrevious = (response.visitedQuestions as string[]).length > 1;
  const isLastQuestion = question.id === survey.questions[survey.questions.length - 1].id;
  
  return (
    <div className="question-screen">
      <div className="container">
        <ProgressIndicator
          current={(response.visitedQuestions as string[]).length}
          total={survey.totalQuestions}
        />
        
        <div className="question-container">
          <h2 className="question-text">{question.text}</h2>
          
          <QuestionRenderer
            question={question}
            value={answer}
            onChange={setAnswer}
          />
          
          {error && (
            <div className="validation-message">{error}</div>
          )}
        </div>
        
        <NavigationButtons
          onPrevious={handlePrevious}
          onNext={handleNext}
          showPrevious={showPrevious}
          disabled={isSaving}
          nextLabel={isLastQuestion ? 'Submit' : 'Next'}
        />
      </div>
    </div>
  );
}
```

**Styling**:

```css
.question-screen {
  background: #FFFFFF;
  min-height: 100vh;
  padding: 40px;
}

.question-screen .container {
  max-width: 800px;
  margin: 0 auto;
}

.question-container {
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  border-radius: 8px;
  padding: 32px;
  margin-bottom: 32px;
}

.question-text {
  font-size: 18px;
  font-weight: 500;
  color: #1A1A1A;
  line-height: 1.6;
  margin-bottom: 24px;
}

.validation-message {
  color: #D32F2F;
  font-size: 14px;
  margin-top: 16px;
}
```

#### 4.3 Progress Indicator Component

**File**: `/src/components/survey/ProgressIndicator.tsx`

```tsx
interface ProgressIndicatorProps {
  current: number;
  total: number;
}

export function ProgressIndicator({ current, total }: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div className="progress-indicator">
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="progress-text">
        <span>Question {current} of {total}</span>
        <span>{percentage}% complete</span>
      </div>
    </div>
  );
}
```

**Styling**:

```css
.progress-indicator {
  margin-bottom: 32px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3D1C35 0%, #3D1C35 100%);
  transition: width 0.3s ease-in-out;
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666666;
  margin-top: 8px;
}
```

#### 4.4 Navigation Buttons Component

**File**: `/src/components/survey/NavigationButtons.tsx`

```tsx
interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  showPrevious: boolean;
  disabled: boolean;
  nextLabel: string;
}

export function NavigationButtons({
  onPrevious,
  onNext,
  showPrevious,
  disabled,
  nextLabel,
}: NavigationButtonsProps) {
  return (
    <div className="navigation-buttons">
      {showPrevious && (
        <button
          className="previous-button"
          onClick={onPrevious}
          disabled={disabled}
        >
          Previous
        </button>
      )}
      
      <button
        className="next-button"
        onClick={onNext}
        disabled={disabled}
      >
        {disabled ? 'Saving...' : nextLabel}
      </button>
    </div>
  );
}
```

**Styling**:

```css
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

.previous-button:hover:not(:disabled) {
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

.next-button:hover:not(:disabled) {
  background: #C2185B;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(233, 30, 99, 0.3);
}

.previous-button:disabled,
.next-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
```

---

### Step 5: Create Logic Evaluation

**File**: `/src/lib/survey/logic.ts`

```typescript
export function evaluateNextQuestion(
  survey: Survey,
  currentQuestionId: string,
  answer: any,
  allAnswers: Record<string, any>
): string | null | 'TERMINATE' {
  const currentQuestion = survey.questions.find(q => q.id === currentQuestionId);
  
  if (!currentQuestion) {
    return null;
  }
  
  // Check conditional logic
  if (currentQuestion.logic?.conditionalNavigation) {
    for (const condition of currentQuestion.logic.conditionalNavigation) {
      if (evaluateCondition(condition.condition, answer, allAnswers)) {
        if (condition.target.startsWith('TERM')) {
          return 'TERMINATE';
        }
        return condition.target;
      }
    }
  }
  
  // Use default navigation
  if (currentQuestion.logic?.defaultTarget) {
    return currentQuestion.logic.defaultTarget;
  }
  
  // Next sequential question
  const currentIndex = survey.questions.findIndex(q => q.id === currentQuestionId);
  
  if (currentIndex === survey.questions.length - 1) {
    return null; // Survey complete
  }
  
  return survey.questions[currentIndex + 1].id;
}

function evaluateCondition(
  condition: string,
  answer: any,
  allAnswers: Record<string, any>
): boolean {
  // Parse and evaluate condition
  // Example: "response = [1, 6, 7]"
  // Example: "Q1 = 'Yes' AND Q2 > 5"
  
  // Simple implementation for "response = [values]"
  if (condition.startsWith('response =')) {
    const valuesStr = condition.match(/\[(.*?)\]/)?.[1];
    if (valuesStr) {
      const values = valuesStr.split(',').map(v => v.trim());
      return values.includes(String(answer));
    }
  }
  
  // Add more complex logic evaluation as needed
  
  return false;
}
```

---

### Step 6: Test the Flow

1. **Create a test survey** in the authoring interface
2. **Publish the survey**
3. **Navigate to** `/s/[surveyId]`
4. **Click "Start Survey"**
5. **Answer questions** and test navigation
6. **Complete survey** and verify thank you screen

---

## ✅ Checklist

- [ ] Routes created
- [ ] Database schema added
- [ ] API routes implemented
- [ ] Welcome screen component created
- [ ] Question screen component created
- [ ] Thank you screen component created
- [ ] Progress indicator component created
- [ ] Navigation buttons component created
- [ ] Logic evaluation implemented
- [ ] Styling applied (matching `../shared/survey-ui-theme.md`)
- [ ] Mobile responsive
- [ ] Tested complete flow
- [ ] Error handling added
- [ ] Accessibility features added

---

## 📚 Related Documentation

- **Runtime Spec**: `survey-runtime-spec.md`
- **Routes Spec**: `survey-routes-spec.md`
- **Navigation Spec**: `survey-navigation-spec.md`
- **Theme**: `../shared/survey-ui-theme.md`

---

**Next Steps**: After basic implementation, add advanced features like auto-save, offline support, analytics, etc.

