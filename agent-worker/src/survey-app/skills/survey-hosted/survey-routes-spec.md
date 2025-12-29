# Survey Routes Specification

This document defines the Next.js routing structure for the hosted survey experience.

---

## 🎯 Purpose

Define the complete routing structure, URL patterns, and route handlers for the survey runtime.

---

## 📁 Route Structure

```
/src/app/s/[surveyId]/
├── page.tsx                          # Welcome screen
├── layout.tsx                        # Survey layout wrapper
├── question/
│   └── [questionId]/
│       └── page.tsx                  # Question screen
├── complete/
│   └── page.tsx                      # Thank you screen
├── terminate/
│   └── page.tsx                      # Termination screen (disqualified)
└── error/
    └── page.tsx                      # Error screen
```

---

## 🛣️ Route Definitions

### 1. Survey Welcome Screen

**Route**: `/s/[surveyId]`

**File**: `/src/app/s/[surveyId]/page.tsx`

**Purpose**: Display welcome message and start survey

**Implementation**:
```tsx
// /src/app/s/[surveyId]/page.tsx
import { getSurvey } from '@/lib/surveys';
import { WelcomeScreen } from '@/components/survey/WelcomeScreen';

export default async function SurveyWelcomePage({
  params,
}: {
  params: { surveyId: string };
}) {
  const survey = await getSurvey(params.surveyId);
  
  if (!survey) {
    notFound();
  }
  
  if (!survey.published) {
    return <div>This survey is not currently available.</div>;
  }
  
  return <WelcomeScreen survey={survey} />;
}

export async function generateMetadata({
  params,
}: {
  params: { surveyId: string };
}) {
  const survey = await getSurvey(params.surveyId);
  
  return {
    title: survey?.title || 'Survey',
    description: survey?.description || 'Complete this survey',
  };
}
```

**Client Component**:
```tsx
// /src/components/survey/WelcomeScreen.tsx
'use client';

import { useRouter } from 'next/navigation';
import { createSurveyResponse } from '@/lib/api/responses';

export function WelcomeScreen({ survey }: { survey: Survey }) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  
  const handleStart = async () => {
    setIsStarting(true);
    
    try {
      // Create survey response record
      const response = await createSurveyResponse(survey.id);
      
      // Get first question
      const firstQuestionId = survey.questions[0].id;
      
      // Navigate to first question
      router.push(`/s/${survey.id}/question/${firstQuestionId}`);
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
          {survey.welcomeMessage || DEFAULT_WELCOME_MESSAGE}
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

---

### 2. Question Screen

**Route**: `/s/[surveyId]/question/[questionId]`

**File**: `/src/app/s/[surveyId]/question/[questionId]/page.tsx`

**Purpose**: Display question and collect response

**Implementation**:
```tsx
// /src/app/s/[surveyId]/question/[questionId]/page.tsx
import { getSurvey } from '@/lib/surveys';
import { getSurveyResponse } from '@/lib/responses';
import { QuestionScreen } from '@/components/survey/QuestionScreen';
import { redirect } from 'next/navigation';

export default async function QuestionPage({
  params,
  searchParams,
}: {
  params: { surveyId: string; questionId: string };
  searchParams: { responseId?: string };
}) {
  const survey = await getSurvey(params.surveyId);
  const responseId = searchParams.responseId;
  
  if (!survey || !responseId) {
    redirect(`/s/${params.surveyId}`);
  }
  
  const response = await getSurveyResponse(responseId);
  
  if (!response) {
    redirect(`/s/${params.surveyId}`);
  }
  
  const question = survey.questions.find(q => q.id === params.questionId);
  
  if (!question) {
    redirect(`/s/${params.surveyId}/error`);
  }
  
  return (
    <QuestionScreen
      survey={survey}
      question={question}
      response={response}
    />
  );
}
```

**Client Component**:
```tsx
// /src/components/survey/QuestionScreen.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressIndicator } from './ProgressIndicator';
import { QuestionRenderer } from './QuestionRenderer';
import { NavigationButtons } from './NavigationButtons';
import { saveResponse, getNextQuestion } from '@/lib/api/responses';

export function QuestionScreen({
  survey,
  question,
  response,
}: {
  survey: Survey;
  question: Question;
  response: SurveyResponse;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState(response.answers[question.id]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Auto-save
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (answer !== undefined) {
        await saveResponse(response.id, question.id, answer);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [answer, response.id, question.id]);
  
  const handleNext = async () => {
    // Validate
    const validationError = validateAnswer(question, answer);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Save response
      await saveResponse(response.id, question.id, answer);
      
      // Get next question
      const nextQuestionId = await getNextQuestion(
        response.id,
        question.id,
        answer
      );
      
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
      console.error('Failed to save response:', error);
      setError('Failed to save response. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrevious = () => {
    const previousQuestionId = response.visitedQuestions[
      response.visitedQuestions.length - 2
    ];
    
    if (previousQuestionId) {
      router.push(
        `/s/${survey.id}/question/${previousQuestionId}?responseId=${response.id}`
      );
    } else {
      router.push(`/s/${survey.id}`);
    }
  };
  
  return (
    <div className="question-screen">
      <div className="container">
        <ProgressIndicator
          current={response.visitedQuestions.length}
          total={survey.totalQuestions}
        />
        
        <div className="question-container">
          <QuestionRenderer
            question={question}
            value={answer}
            onChange={setAnswer}
            error={error}
          />
        </div>
        
        <NavigationButtons
          onPrevious={handlePrevious}
          onNext={handleNext}
          showPrevious={response.visitedQuestions.length > 1}
          isLastQuestion={isLastQuestion(survey, question)}
          disabled={isSaving}
        />
      </div>
    </div>
  );
}
```

---

### 3. Thank You Screen

**Route**: `/s/[surveyId]/complete`

**File**: `/src/app/s/[surveyId]/complete/page.tsx`

**Purpose**: Display completion message

**Implementation**:
```tsx
// /src/app/s/[surveyId]/complete/page.tsx
import { getSurvey } from '@/lib/surveys';
import { getSurveyResponse, markComplete } from '@/lib/responses';
import { ThankYouScreen } from '@/components/survey/ThankYouScreen';
import { redirect } from 'next/navigation';

export default async function CompletePage({
  params,
  searchParams,
}: {
  params: { surveyId: string };
  searchParams: { responseId?: string };
}) {
  const survey = await getSurvey(params.surveyId);
  const responseId = searchParams.responseId;
  
  if (!survey || !responseId) {
    redirect(`/s/${params.surveyId}`);
  }
  
  const response = await getSurveyResponse(responseId);
  
  if (!response) {
    redirect(`/s/${params.surveyId}`);
  }
  
  // Mark as complete
  await markComplete(responseId);
  
  return <ThankYouScreen survey={survey} />;
}
```

**Client Component**:
```tsx
// /src/components/survey/ThankYouScreen.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ThankYouScreen({ survey }: { survey: Survey }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  
  useEffect(() => {
    if (survey.redirectUrl) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            window.location.href = survey.redirectUrl!;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [survey.redirectUrl]);
  
  // Prevent back navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  return (
    <div className="thank-you-screen">
      <div className="container">
        <div className="completion-icon">✓</div>
        <h1 className="thank-you-title">Thank You!</h1>
        <p className="thank-you-message">
          {survey.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE}
        </p>
        {survey.redirectUrl && (
          <p className="redirect-info">
            Redirecting in {countdown} seconds...
          </p>
        )}
      </div>
    </div>
  );
}
```

---

### 4. Termination Screen

**Route**: `/s/[surveyId]/terminate`

**File**: `/src/app/s/[surveyId]/terminate/page.tsx`

**Purpose**: Display disqualification message

**Implementation**:
```tsx
// /src/app/s/[surveyId]/terminate/page.tsx
import { getSurvey } from '@/lib/surveys';
import { TerminationScreen } from '@/components/survey/TerminationScreen';

export default async function TerminatePage({
  params,
}: {
  params: { surveyId: string };
}) {
  const survey = await getSurvey(params.surveyId);
  
  if (!survey) {
    notFound();
  }
  
  return <TerminationScreen survey={survey} />;
}
```

**Client Component**:
```tsx
// /src/components/survey/TerminationScreen.tsx
'use client';

import { useRouter } from 'next/navigation';

export function TerminationScreen({ survey }: { survey: Survey }) {
  const router = useRouter();

  const handleReturnHome = () => {
    // CRITICAL: Return to home redirects to /s/preview
    router.push('/s/preview');
  };

  return (
    <div className="termination-screen">
      <div className="container">
        <h1 className="termination-title">Survey Complete</h1>
        <p className="termination-message">
          {survey.terminationMessage ||
            "Thank you for your interest in this survey. Unfortunately, you do not meet the qualification criteria for this particular study. We appreciate your time."}
        </p>
        <button
          className="return-home-button"
          onClick={handleReturnHome}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}
```

**Important**: The "Return to Home" button must redirect to `/s/preview`, not to any other route.

---

### 5. Error Screen

**Route**: `/s/[surveyId]/error`

**File**: `/src/app/s/[surveyId]/error/page.tsx`

**Purpose**: Display error message

**Implementation**:
```tsx
// /src/app/s/[surveyId]/error/page.tsx
export default function ErrorPage({
  searchParams,
}: {
  searchParams: { message?: string };
}) {
  return (
    <div className="error-screen">
      <div className="container">
        <h1>Something went wrong</h1>
        <p>{searchParams.message || 'An unexpected error occurred.'}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  );
}
```

---

### 6. Survey Layout

**File**: `/src/app/s/[surveyId]/layout.tsx`

**Purpose**: Shared layout for all survey pages

**Implementation**:
```tsx
// /src/app/s/[surveyId]/layout.tsx
import { getSurvey } from '@/lib/surveys';
import { SurveyProvider } from '@/components/survey/SurveyProvider';

export default async function SurveyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { surveyId: string };
}) {
  const survey = await getSurvey(params.surveyId);
  
  return (
    <SurveyProvider survey={survey}>
      <div className="survey-layout">
        {children}
      </div>
    </SurveyProvider>
  );
}
```

---

## 🔗 URL Patterns

### Query Parameters

**responseId**: Survey response ID (passed between pages)
```
/s/abc123/question/Q1?responseId=resp_xyz789
```

**returnUrl**: Return URL after completion (optional)
```
/s/abc123?returnUrl=https://example.com/thanks
```

**preview**: Preview mode (for testing)
```
/s/abc123?preview=true
```

---

## 🛡️ Route Protection

### Published Check
```typescript
// Middleware or layout
if (!survey.published && !isPreviewMode) {
  return <div>This survey is not currently available.</div>;
}
```

### Response Validation
```typescript
// Check if response belongs to survey
if (response.surveyId !== surveyId) {
  redirect(`/s/${surveyId}/error?message=Invalid response`);
}
```

### Completion Check
```typescript
// Prevent accessing completed survey
if (response.completedAt) {
  redirect(`/s/preview/complete?responseId=${response.id}`);
}
```

---

## 📊 API Routes

### Create Response

**Route**: `/api/surveys/[surveyId]/responses`

**Method**: POST

**Implementation**:
```typescript
// /src/app/api/surveys/[surveyId]/responses/route.ts
export async function POST(
  request: Request,
  { params }: { params: { surveyId: string } }
) {
  const survey = await getSurvey(params.surveyId);
  
  if (!survey || !survey.published) {
    return NextResponse.json(
      { error: 'Survey not found' },
      { status: 404 }
    );
  }
  
  // Create response record
  const response = await createResponse({
    surveyId: params.surveyId,
    surveyVersion: survey.version,
    startedAt: new Date(),
    deviceInfo: getDeviceInfo(request),
  });
  
  return NextResponse.json(response);
}
```

### Save Answer

**Route**: `/api/responses/[responseId]/answers`

**Method**: POST

**Implementation**:
```typescript
// /src/app/api/responses/[responseId]/answers/route.ts
export async function POST(
  request: Request,
  { params }: { params: { responseId: string } }
) {
  const { questionId, answer } = await request.json();
  
  const response = await getSurveyResponse(params.responseId);
  
  if (!response) {
    return NextResponse.json(
      { error: 'Response not found' },
      { status: 404 }
    );
  }
  
  // Save answer
  await saveAnswer(params.responseId, questionId, answer);
  
  return NextResponse.json({ success: true });
}
```

### Get Next Question

**Route**: `/api/responses/[responseId]/next`

**Method**: POST

**Implementation**:
```typescript
// /src/app/api/responses/[responseId]/next/route.ts
export async function POST(
  request: Request,
  { params }: { params: { responseId: string } }
) {
  const { currentQuestionId, answer } = await request.json();
  
  const response = await getSurveyResponse(params.responseId);
  const survey = await getSurvey(response.surveyId);
  
  // Evaluate logic
  const nextQuestionId = evaluateNextQuestion(
    survey,
    currentQuestionId,
    answer,
    response.answers
  );
  
  return NextResponse.json({ nextQuestionId });
}
```

---

## 🔄 Navigation Flow

```
Welcome Screen (/s/[surveyId])
        ↓ Start Survey
Question 1 (/s/[surveyId]/question/Q1?responseId=xxx)
        ↓ Next
Question 2 (/s/[surveyId]/question/Q2?responseId=xxx)
        ↓ Next (with logic evaluation)
Question 5 (/s/[surveyId]/question/Q5?responseId=xxx) [Skipped Q3, Q4]
        ↓ Previous
Question 2 (/s/[surveyId]/question/Q2?responseId=xxx)
        ↓ Next
Question 5 (/s/[surveyId]/question/Q5?responseId=xxx)
        ↓ Next
...
        ↓ Submit
Thank You (/s/[surveyId]/complete?responseId=xxx)
```

---

## 📱 Mobile Considerations

### Deep Linking
Support deep links to specific questions:
```
myapp://survey/abc123/question/Q5?responseId=xxx
```

### PWA Support
```typescript
// /src/app/s/[surveyId]/manifest.json
{
  "name": "Survey",
  "short_name": "Survey",
  "start_url": "/s/abc123",
  "display": "standalone"
}
```

---

## Related Documentation

- **Runtime**: `survey-runtime-spec.md`
- **Navigation**: `survey-navigation-spec.md`
- **State**: `survey-state-management.md`
- **Logic**: `survey-logic-evaluation.md`

