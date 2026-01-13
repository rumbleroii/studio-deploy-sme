'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sampleSurvey } from '../../../data/sample-survey';
import { useSurvey } from '../../../lib/survey-context';
import {
  getNextQuestionId,
  validateResponse,
  shouldShowQuestion
} from '../../../lib/logic-evaluator';
import {
  isProduction,
  submitResponses,
  buildSubmitPayload,
  setRespondentId as saveRespondentId,
  SURVEY_ID,
} from '../../../lib/api';

// Lazy load QuestionRenderer for better performance
const QuestionRenderer = lazy(() => import('../../../components/QuestionRenderer').then(mod => ({ default: mod.QuestionRenderer })));

// Loading fallback for question
const QuestionLoader = () => (
  <div className="bg-white rounded-lg shadow-lg p-8 animate-pulse">
    <div className="space-y-4">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="space-y-2 mt-6">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

export default function QuestionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get('q');

  const { responses, addVisitedQuestion, visitedQuestions, progress, setProgress } = useSurvey();
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);

  // Get all questions from all sections
  const allQuestions = sampleSurvey.sections.flatMap(section => section.questions);
  const totalQuestions = allQuestions.length;

  // Find current question
  const currentQuestion = allQuestions.find(q => q.id === questionId);

  // Find grouped questions (questions with same displayGroup render together)
  const groupedQuestions = React.useMemo(() => {
    if (!currentQuestion) return [];
    if (!currentQuestion.metadata?.displayGroup) return [currentQuestion];
    const groupId = currentQuestion.metadata.displayGroup;
    return allQuestions.filter(q => q.metadata?.displayGroup === groupId);
  }, [currentQuestion, allQuestions]);

  useEffect(() => {
    if (isProduction && questionId && currentQuestion) {
      // Allow access if this is the first question being accessed
      if (visitedQuestions.length === 0) {
        return;
      }

      const currentQuestionIndex = visitedQuestions.indexOf(questionId);
      const lastVisitedQuestionId = visitedQuestions[visitedQuestions.length - 1];
      const lastVisitedQuestion = allQuestions.find(q => q.id === lastVisitedQuestionId);

      // Calculate valid previous and next questions
      const immediatePreviousQuestionId = visitedQuestions.length > 1
        ? visitedQuestions[visitedQuestions.length - 2]
        : null;

      const immediateNextQuestionId = lastVisitedQuestion
        ? getNextQuestionId(lastVisitedQuestion, responses, allQuestions)
        : null;

      // Only allow access to:
      // 1. Current question (last visited)
      // 2. Immediate previous question
      // 3. Immediate next question based on logic
      const isCurrentQuestion = questionId === lastVisitedQuestionId;
      const isImmediatePrevious = questionId === immediatePreviousQuestionId;
      const isImmediateNext = questionId === immediateNextQuestionId;

      if (!isCurrentQuestion && !isImmediatePrevious && !isImmediateNext) {
        console.warn('Invalid question access attempt:', questionId);
        console.warn('Allowed:', { lastVisitedQuestionId, immediatePreviousQuestionId, immediateNextQuestionId });
        // Redirect to last visited question
        router.replace(`/survey/question?q=${lastVisitedQuestionId}`);
      }
    }
  }, [questionId, currentQuestion, visitedQuestions, responses, allQuestions, router]);

  useEffect(() => {
    if (questionId) {
      const wasAlreadyVisited = visitedQuestions.includes(questionId);
      setIsFirstVisit(!wasAlreadyVisited);

      if (!wasAlreadyVisited) {
        addVisitedQuestion(questionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]); // Only run when questionId changes, not when visitedQuestions changes

  // Separate effect for progress calculation
  useEffect(() => {
    const visitedCount = visitedQuestions.length;
    const progressPercent = Math.round((visitedCount / totalQuestions) * 100);
    setProgress(progressPercent);
  }, [visitedQuestions, totalQuestions, setProgress]);

  // Reset submitting state when question changes
  useEffect(() => {
    setIsSubmitting(false);
    setError('');
  }, [questionId]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Question not found</h1>
          <p className="text-gray-600 mt-2">Question ID: {questionId}</p>
        </div>
      </div>
    );
  }

  const handleNext = async () => {
    // Prevent multiple clicks
    if (isSubmitting) return;

    // Validate all grouped questions
    for (const question of groupedQuestions) {
      const currentValue = responses[question.id];
      const validation = validateResponse(question, currentValue, responses, allQuestions);

      if (!validation.isValid) {
        setError(validation.error || 'Please answer this question');
        return;
      }
    }

    setError('');

    // Get next question from last in group
    const lastGroupQuestion = groupedQuestions[groupedQuestions.length - 1] || currentQuestion;
    const nextQuestionId = getNextQuestionId(lastGroupQuestion, responses, allQuestions);

    console.log('Navigating from', currentQuestion.id, 'to', nextQuestionId);

    // Submit responses to API (only in production mode)
    if (isProduction) {
      setIsSubmitting(true);
      try {
        let status: 'incomplete' | 'complete' | 'terminated' = 'incomplete';
        if (nextQuestionId === 'COMPLETE') {
          status = 'complete';
        } else if (nextQuestionId === 'TERMINATE') {
          status = 'terminated';
        }

        // Submit responses to API using environment constants
        const payload = buildSubmitPayload(
          SURVEY_ID,
          responses,
          status,
          currentQuestion.id,
          visitedQuestions,
          allQuestions
        );

        const result = await submitResponses(payload);

        // Save respondentId to localStorage for future requests
        if (result.success && result.respondentId) {
          saveRespondentId(result.respondentId);
        }
      } catch (err) {
        console.error('Error submitting response:', err);
        setError('Failed to submit response. Please try again.');
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }

    // Navigate to next question or completion page
    if (nextQuestionId === 'COMPLETE') {
      router.push(`/survey/complete`);
    } else if (nextQuestionId === 'TERMINATE') {
      router.push(`/survey/terminate`);
    } else if (nextQuestionId) {
      router.push(`/survey/question?q=${nextQuestionId}`);
    } else {
      router.push(`/survey/complete`);
    }
  };

  const handlePrevious = () => {
    // Go to previous visited question
    const currentIndex = visitedQuestions.indexOf(questionId || '');
    if (currentIndex > 0) {
      const previousQuestionId = visitedQuestions[currentIndex - 1];
      router.push(`/survey/question?q=${previousQuestionId}`);
    } else {
      router.push(`/survey`);
    }
  };

  const canGoPrevious = visitedQuestions.length > 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#3D1C35] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card with lazy loading - supports grouped questions */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <Suspense fallback={<QuestionLoader />}>
            {groupedQuestions.map((question, index) => (
              <div key={question.id} className={index > 0 ? 'mt-8 pt-8 border-t border-gray-200' : ''}>
                <QuestionRenderer
                  question={question}
                  allQuestions={allQuestions}
                  isFirstVisit={isFirstVisit}
                  onComplete={() => {}}
                />
              </div>
            ))}
          </Suspense>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`button button-secondary ${
              !canGoPrevious ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            ← Previous
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`button button-primary ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Next →'}
          </button>
        </div>

        {/* Question Counter */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Question {visitedQuestions.indexOf(questionId || '') + 1} of {totalQuestions}
        </div>
      </div>
    </div>
  );
}
