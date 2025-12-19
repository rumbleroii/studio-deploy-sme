'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sampleSurvey } from '../../../../data/sample-survey';
import { useSurvey } from '../../../../lib/survey-context';
import { QuestionRenderer } from '../../../../components/QuestionRenderer';
import {
  getNextQuestionId,
  validateResponse,
  shouldShowQuestion
} from '../../../../lib/logic-evaluator';

interface PageProps {
  params: Promise<{ surveyId: string }>;
}

export default function QuestionPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionId = searchParams.get('q');
  const [surveyId, setSurveyId] = React.useState<string>('');

  React.useEffect(() => {
    params.then((p) => setSurveyId(p.surveyId));
  }, [params]);

  const { responses, addVisitedQuestion, visitedQuestions, progress, setProgress } = useSurvey();
  const [error, setError] = useState<string>('');

  // Get all questions from all sections
  const allQuestions = sampleSurvey.sections.flatMap(section => section.questions);
  const totalQuestions = allQuestions.length;

  // Find current question
  const currentQuestion = allQuestions.find(q => q.id === questionId);

  useEffect(() => {
    if (questionId && !visitedQuestions.includes(questionId)) {
      addVisitedQuestion(questionId);
    }

    // Calculate progress
    const visitedCount = visitedQuestions.length;
    const progressPercent = Math.round((visitedCount / totalQuestions) * 100);
    setProgress(progressPercent);
  }, [questionId, visitedQuestions, totalQuestions]);

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

  const handleNext = () => {
    // Validate response
    const currentValue = responses[currentQuestion.id];
    const validation = validateResponse(currentQuestion, currentValue);

    if (!validation.isValid) {
      setError(validation.error || 'Please answer this question');
      return;
    }

    setError('');

    // Get next question
    const nextQuestionId = getNextQuestionId(currentQuestion, responses, allQuestions);

    if (nextQuestionId === 'COMPLETE') {
      router.push(`/s/preview/complete`);
    } else if (nextQuestionId === 'TERMINATE') {
      router.push(`/s/preview/terminate`);
    } else if (nextQuestionId) {
      router.push(`/s/preview/question?q=${nextQuestionId}`);
    } else {
      router.push(`/s/preview/complete`);
    }
  };

  const handlePrevious = () => {
    // Go to previous visited question
    const currentIndex = visitedQuestions.indexOf(questionId || '');
    if (currentIndex > 0) {
      const previousQuestionId = visitedQuestions[currentIndex - 1];
      router.push(`/s/preview/question?q=${previousQuestionId}`);
    } else {
      router.push(`/s/preview`);
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

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <QuestionRenderer
            question={currentQuestion}
            onComplete={(value) => {
              // Response is already saved via context
            }}
          />

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
            className="button button-primary"
          >
            Next →
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
