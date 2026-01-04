# Survey Navigation Specification

This document defines how navigation works in the hosted survey, including Previous/Next buttons, logic evaluation, and flow control.

---

## 🎯 Purpose

Define the complete navigation system for survey respondents, including:
- Previous/Next button behavior
- Logic-based routing (skip logic, branching)
- Progress tracking
- Question history
- Edge cases and error handling

---

## 🔄 Navigation Patterns

### 1. Linear Navigation (No Logic)

**Simplest case**: Questions in sequence, no skip logic

```
Q1 → Q2 → Q3 → Q4 → Q5 → Complete
```

**Implementation**:
```typescript
function getNextQuestion(currentQuestionId: string, survey: Survey): string | null {
  const questions = survey.questions;
  const currentIndex = questions.findIndex(q => q.id === currentQuestionId);
  
  if (currentIndex === questions.length - 1) {
    return null; // Survey complete
  }
  
  return questions[currentIndex + 1].id;
}
```

---

### 2. Skip Logic Navigation

**With conditional routing**: Some questions skipped based on answers

```
Q1 → Q2 → Q5 (skipped Q3, Q4)
```

**Implementation**:
```typescript
function getNextQuestion(
  currentQuestion: Question,
  answer: any,
  survey: Survey,
  allResponses: Record<string, any>
): string | null {
  // 1. Check conditional logic
  if (currentQuestion.logic?.conditionalNavigation) {
    for (const condition of currentQuestion.logic.conditionalNavigation) {
      if (evaluateCondition(condition.condition, answer, allResponses)) {
        return condition.target;
      }
    }
  }
  
  // 2. Use default navigation
  if (currentQuestion.logic?.defaultTarget) {
    return currentQuestion.logic.defaultTarget;
  }
  
  // 3. Fall back to next question in sequence
  const questions = survey.questions;
  const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
  
  if (currentIndex === questions.length - 1) {
    return null; // Survey complete
  }
  
  return questions[currentIndex + 1].id;
}
```

---

### 3. Show/Hide Logic Navigation

**With display conditions**: Some questions only shown if condition met

```
Q1 → Q2 → [Q3 hidden] → Q4 → Q5
```

**Implementation**:
```typescript
function getNextVisibleQuestion(
  startQuestionId: string,
  survey: Survey,
  allResponses: Record<string, any>
): string | null {
  let nextQuestionId = getNextQuestion(startQuestionId, survey);
  
  while (nextQuestionId) {
    const nextQuestion = survey.questions.find(q => q.id === nextQuestionId);
    
    if (!nextQuestion) {
      return null;
    }
    
    // Check if question should be shown
    if (shouldShowQuestion(nextQuestion, allResponses)) {
      return nextQuestionId;
    }
    
    // Question hidden, check next one
    nextQuestionId = getNextQuestion(nextQuestionId, survey);
  }
  
  return null; // No more visible questions
}

function shouldShowQuestion(
  question: Question,
  allResponses: Record<string, any>
): boolean {
  if (!question.showCondition) {
    return true; // No condition, always show
  }
  
  return evaluateCondition(question.showCondition, null, allResponses);
}
```

---

### 4. Termination Logic

**Early termination**: Survey ends based on answer (disqualification)

```
Q1 → Q2 → TERMINATE (disqualified)
```

**Implementation**:
```typescript
function getNextQuestion(
  currentQuestion: Question,
  answer: any,
  survey: Survey,
  allResponses: Record<string, any>
): string | null | 'TERMINATE' {
  // Check for termination logic
  if (currentQuestion.logic?.conditionalNavigation) {
    for (const condition of currentQuestion.logic.conditionalNavigation) {
      if (evaluateCondition(condition.condition, answer, allResponses)) {
        if (condition.target.startsWith('TERM')) {
          return 'TERMINATE';
        }
        return condition.target;
      }
    }
  }
  
  // Continue with normal navigation
  return getNextQuestionNormal(currentQuestion, survey);
}
```

---

## 🔙 Previous Button Behavior

### Basic Previous

**Navigate to previous question in history**

```typescript
function handlePrevious(
  visitedQuestions: string[],
  currentQuestionId: string
): string | null {
  const currentIndex = visitedQuestions.indexOf(currentQuestionId);
  
  if (currentIndex <= 0) {
    return null; // At first question
  }
  
  return visitedQuestions[currentIndex - 1];
}
```

### Previous with Skip Logic

**Navigate back through actually visited questions, not all questions**

```
Forward:  Q1 → Q2 → Q5 (skipped Q3, Q4)
Backward: Q5 → Q2 → Q1 (not Q5 → Q4 → Q3 → Q2 → Q1)
```

**Implementation**:
```typescript
interface NavigationState {
  visitedQuestions: string[]; // ['Q1', 'Q2', 'Q5']
  currentQuestionId: string;   // 'Q5'
}

function handlePrevious(state: NavigationState): string | null {
  const { visitedQuestions, currentQuestionId } = state;
  const currentIndex = visitedQuestions.indexOf(currentQuestionId);
  
  if (currentIndex <= 0) {
    return null; // At first question or not found
  }
  
  // Return previous visited question
  return visitedQuestions[currentIndex - 1];
}
```

### Previous Button Display Rules

```typescript
function shouldShowPreviousButton(
  visitedQuestions: string[],
  currentQuestionId: string,
  survey: Survey
): boolean {
  // Don't show on first question
  if (visitedQuestions.length <= 1) {
    return false;
  }
  
  // Don't show if survey doesn't allow back navigation
  if (survey.settings?.allowBack === false) {
    return false;
  }
  
  // Don't show on termination screens
  if (currentQuestionId.startsWith('TERM')) {
    return false;
  }
  
  return true;
}
```

---

## ➡️ Next Button Behavior

### Next Button States

```typescript
type NextButtonState = 
  | 'enabled'      // Can proceed
  | 'disabled'     // Cannot proceed (validation failed or no answer)
  | 'loading'      // Saving/processing
  | 'submit';      // Last question (shows "Submit" instead of "Next")

function getNextButtonState(
  question: Question,
  answer: any,
  isLastQuestion: boolean,
  isSaving: boolean
): NextButtonState {
  if (isSaving) {
    return 'loading';
  }
  
  // Check if required and not answered
  if (question.required && !answer) {
    return 'disabled';
  }
  
  // Check validation
  const validationError = validateAnswer(question, answer);
  if (validationError) {
    return 'disabled';
  }
  
  // Last question
  if (isLastQuestion) {
    return 'submit';
  }
  
  return 'enabled';
}
```

### Next Button Labels

```typescript
function getNextButtonLabel(
  isLastQuestion: boolean,
  isSaving: boolean
): string {
  if (isSaving) {
    return 'Saving...';
  }
  
  if (isLastQuestion) {
    return 'Submit';
  }
  
  return 'Next';
}
```

---

## 📊 Progress Tracking

### Progress Calculation

**Method 1: Simple (Questions Answered / Total Questions)**
```typescript
function calculateProgress(
  answeredQuestions: number,
  totalQuestions: number
): number {
  return Math.round((answeredQuestions / totalQuestions) * 100);
}
```

**Method 2: Visited Questions (Accounts for Skip Logic)**
```typescript
function calculateProgress(
  visitedQuestions: string[],
  totalQuestions: number
): number {
  return Math.round((visitedQuestions.length / totalQuestions) * 100);
}
```

**Method 3: Estimated Remaining (Accounts for Logic)**
```typescript
function calculateProgress(
  currentQuestionId: string,
  survey: Survey,
  allResponses: Record<string, any>
): number {
  // Estimate remaining questions based on current answers and logic
  const remainingQuestions = estimateRemainingQuestions(
    currentQuestionId,
    survey,
    allResponses
  );
  
  const totalEstimated = Object.keys(allResponses).length + remainingQuestions;
  const progress = (Object.keys(allResponses).length / totalEstimated) * 100;
  
  return Math.round(progress);
}
```

### Progress Display

```tsx
<ProgressIndicator
  current={visitedQuestions.length}
  total={totalQuestions}
  percentage={calculateProgress(visitedQuestions.length, totalQuestions)}
/>
```

---

## 🎯 Navigation Flow Examples

### Example 1: Simple Linear Survey

```
Survey: 5 questions, no logic

Q1 → Q2 → Q3 → Q4 → Q5 → Complete

Navigation:
- Next always goes to next question
- Previous always goes to previous question
- Progress: 20%, 40%, 60%, 80%, 100%
```

### Example 2: Survey with Skip Logic

```
Survey: 5 questions, skip logic on Q2

Q1: "Do you own a smartphone?"
  - Yes → Q2
  - No → Q4 (skip Q2, Q3)

Q2: "Which brand?"
Q3: "How satisfied?"
Q4: "Demographics"
Q5: "Comments"

Path if answer "Yes": Q1 → Q2 → Q3 → Q4 → Q5 → Complete
Path if answer "No":  Q1 → Q4 → Q5 → Complete

Navigation:
- Next evaluates logic
- Previous goes to actually visited questions
- Progress adjusts based on path taken
```

### Example 3: Survey with Show/Hide Logic

```
Survey: 5 questions, Q3 only shown if Q2 > 5

Q1: "Rate product (1-10)"
Q2: "Rate service (1-10)"
Q3: "Why high rating?" (only if Q2 > 5)
Q4: "Would recommend?"
Q5: "Comments"

Path if Q2 = 8: Q1 → Q2 → Q3 → Q4 → Q5 → Complete
Path if Q2 = 3: Q1 → Q2 → Q4 → Q5 → Complete (Q3 hidden)

Navigation:
- Next skips hidden questions automatically
- Previous skips hidden questions
- Progress accounts for hidden questions
```

### Example 4: Survey with Termination

```
Survey: Screener with disqualification

Q1: "Age?"
  - Under 18 → TERMINATE
  - 18+ → Q2

Q2: "Location?"
  - USA → Q3
  - Other → TERMINATE

Q3: "Main questions..."

Path if under 18: Q1 → TERMINATE
Path if 18+ and USA: Q1 → Q2 → Q3 → ... → Complete
Path if 18+ and Other: Q1 → Q2 → TERMINATE

Navigation:
- Next evaluates termination logic
- No Previous button on termination screen
- Progress stops at termination
- "Return to Home" button redirects to `/survey`
```

---

## 🔍 Edge Cases

### 1. Circular Logic (Infinite Loop)

**Problem**: Logic creates infinite loop
```
Q1 → Q2 → Q1 → Q2 → Q1 → ...
```

**Solution**: Track visited questions, detect loops
```typescript
function detectLoop(
  visitedQuestions: string[],
  nextQuestionId: string
): boolean {
  const recentVisits = visitedQuestions.slice(-5); // Last 5 questions
  const visitCount = recentVisits.filter(id => id === nextQuestionId).length;
  
  return visitCount >= 2; // Visited same question twice recently
}

function getNextQuestion(...) {
  const nextId = evaluateLogic(...);
  
  if (detectLoop(visitedQuestions, nextId)) {
    // Break loop, go to next sequential question
    return getNextSequentialQuestion(currentQuestionId, survey);
  }
  
  return nextId;
}
```

### 2. All Questions Hidden

**Problem**: All remaining questions are hidden by show/hide logic

**Solution**: Complete survey if no visible questions remain
```typescript
function getNextVisibleQuestion(...) {
  let nextId = getNextQuestion(...);
  let checkedCount = 0;
  const maxChecks = survey.questions.length;
  
  while (nextId && checkedCount < maxChecks) {
    const question = getQuestion(nextId);
    
    if (shouldShowQuestion(question, allResponses)) {
      return nextId;
    }
    
    nextId = getNextQuestion(nextId, survey);
    checkedCount++;
  }
  
  // No visible questions remaining, complete survey
  return null;
}
```

### 3. Invalid Question ID

**Problem**: Logic references non-existent question

**Solution**: Fall back to sequential navigation
```typescript
function getNextQuestion(...) {
  const nextId = evaluateLogic(...);
  
  const nextQuestion = survey.questions.find(q => q.id === nextId);
  
  if (!nextQuestion) {
    console.error(`Invalid question ID: ${nextId}`);
    // Fall back to next sequential question
    return getNextSequentialQuestion(currentQuestionId, survey);
  }
  
  return nextId;
}
```

### 4. Browser Back Button

**Problem**: User clicks browser back button

**Solution**: Handle with router or disable
```typescript
// Option 1: Handle back button
useEffect(() => {
  const handlePopState = (e: PopStateEvent) => {
    e.preventDefault();
    // Use Previous button logic instead
    handlePrevious();
  };
  
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);

// Option 2: Disable back button (for completed surveys)
useEffect(() => {
  if (isCompleted) {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }
}, [isCompleted]);
```

---

## 🎨 Navigation UI Components

### Navigation Buttons Component

```tsx
interface NavigationButtonsProps {
  onPrevious: () => void;
  onNext: () => void;
  showPrevious: boolean;
  nextButtonState: NextButtonState;
  nextButtonLabel: string;
}

export function NavigationButtons({
  onPrevious,
  onNext,
  showPrevious,
  nextButtonState,
  nextButtonLabel,
}: NavigationButtonsProps) {
  return (
    <div className="navigation-buttons">
      {showPrevious && (
        <button
          className="previous-button"
          onClick={onPrevious}
          type="button"
        >
          Previous
        </button>
      )}
      
      <button
        className="next-button"
        onClick={onNext}
        disabled={nextButtonState === 'disabled' || nextButtonState === 'loading'}
        type="button"
      >
        {nextButtonLabel}
      </button>
    </div>
  );
}
```

### Progress Indicator Component

```tsx
interface ProgressIndicatorProps {
  current: number;
  total: number;
  percentage?: number;
  showCount?: boolean;
  showPercentage?: boolean;
}

export function ProgressIndicator({
  current,
  total,
  percentage,
  showCount = true,
  showPercentage = true,
}: ProgressIndicatorProps) {
  const progress = percentage || (current / total) * 100;
  
  return (
    <div className="progress-indicator">
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-text">
        {showCount && <span>Question {current} of {total}</span>}
        {showPercentage && <span>{Math.round(progress)}% complete</span>}
      </div>
    </div>
  );
}
```

---

## 📱 Mobile Navigation

### Touch Gestures

```typescript
// Swipe to navigate
function useSwipeNavigation(
  onPrevious: () => void,
  onNext: () => void,
  canGoPrevious: boolean,
  canGoNext: boolean
) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const minSwipeDistance = 50;
  
  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && canGoNext) {
      onNext();
    }
    
    if (isRightSwipe && canGoPrevious) {
      onPrevious();
    }
  };
  
  return { onTouchStart, onTouchMove, onTouchEnd };
}
```

### Sticky Navigation (Mobile)

```css
@media (max-width: 767px) {
  .navigation-buttons {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #FFFFFF;
    padding: 16px;
    border-top: 1px solid #E0E0E0;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
  }
  
  /* Add padding to question container to prevent overlap */
  .question-container {
    padding-bottom: 80px;
  }
}
```

---

## ♿ Keyboard Navigation

```typescript
function useKeyboardNavigation(
  onPrevious: () => void,
  onNext: () => void,
  canGoPrevious: boolean,
  canGoNext: boolean
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Left Arrow = Previous
      if (e.altKey && e.key === 'ArrowLeft' && canGoPrevious) {
        e.preventDefault();
        onPrevious();
      }
      
      // Alt + Right Arrow = Next
      if (e.altKey && e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        onNext();
      }
      
      // Enter = Next (if not in textarea)
      if (e.key === 'Enter' && !e.shiftKey && canGoNext) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          onNext();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrevious, onNext, canGoPrevious, canGoNext]);
}
```

---

## Related Documentation

- **Runtime**: `survey-runtime-spec.md`
- **Routes**: `survey-routes-spec.md`
- **Logic**: `survey-logic-evaluation.md`
- **State**: `survey-state-management.md`

