'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Survey, Question } from '../types/survey';
import { QuestionCard } from './QuestionCard';
import { shouldShowQuestion, getNextQuestionId } from '../utils/logicEvaluator';

interface InteractiveSurveyProps {
  survey: Survey;
  onComplete?: (responses: Record<string, any>) => void;
  onTerminate?: (responses: Record<string, any>) => void;
  showBadges?: boolean;
  showNotes?: boolean;
}

export const InteractiveSurvey: React.FC<InteractiveSurveyProps> = ({
  survey,
  onComplete,
  onTerminate,
  showBadges = true,
  showNotes = true
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Flatten all questions from all sections
  const allQuestions = useMemo(() => {
    const questions: Question[] = [];
    survey.sections.forEach(section => {
      questions.push(...section.questions);
    });
    return questions;
  }, [survey]);

  // Create a map of question ID to question for quick lookup
  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    allQuestions.forEach(q => map.set(q.id, q));
    return map;
  }, [allQuestions]);

  // Get ordered question IDs
  const orderedQuestionIds = useMemo(() => {
    return allQuestions.map(q => q.id);
  }, [allQuestions]);

  // Filter visible questions based on current responses and logic
  const visibleQuestions = useMemo(() => {
    return allQuestions.filter(question =>
      shouldShowQuestion(question.id, questionMap, responses, orderedQuestionIds)
    );
  }, [allQuestions, questionMap, responses, orderedQuestionIds]);

  // Get current question
  const currentQuestion = visibleQuestions[currentQuestionIndex];

  // Handle response change
  const handleResponseChange = (questionId: string, value: any) => {
    const newResponses = {
      ...responses,
      [questionId]: value
    };
    setResponses(newResponses);

    // Re-evaluate visibility and potentially adjust current index
    const question = questionMap.get(questionId);
    if (question) {
      // Check if there are any termination conditions
      const matchedLogic = question.logic?.find(logic => {
        const { operator, left, right } = logic.when;
        const leftValue = left ? newResponses[left] : undefined;

        if (operator === 'eq') return leftValue === right;
        if (operator === 'neq') return leftValue !== right;
        // Add more operators as needed
        return false;
      });

      if (matchedLogic?.action === 'terminate') {
        onTerminate?.(newResponses);
      }
    }
  };

  // Handle navigation
  const handleNext = () => {
    if (!currentQuestion) return;

    const nextQuestionId = getNextQuestionId(
      currentQuestion.id,
      responses,
      currentQuestion,
      orderedQuestionIds,
      questionMap
    );

    if (nextQuestionId === null) {
      // Survey complete
      onComplete?.(responses);
      return;
    }

    // Find the index of the next question in visible questions
    const nextIndex = visibleQuestions.findIndex(q => q.id === nextQuestionId);
    if (nextIndex !== -1) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      // If next question is not in visible questions, complete survey
      onComplete?.(responses);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const canGoNext = () => {
    if (!currentQuestion) return false;

    // Check if required question is answered
    if (currentQuestion.required && !responses[currentQuestion.id]) {
      return false;
    }

    return true;
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Survey Complete</h2>
          <p className="text-gray-600">Thank you for completing the survey!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Progress indicator */}
      {survey.settings?.showProgress && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {visibleQuestions.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentQuestionIndex + 1) / visibleQuestions.length) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentQuestionIndex + 1) / visibleQuestions.length) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Question Card */}
      <QuestionCard
        question={currentQuestion}
        value={responses[currentQuestion.id]}
        onChange={handleResponseChange}
        showBadges={showBadges}
        showNotes={showNotes}
        responses={responses}
        allQuestions={allQuestions}
      />

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0 || !survey.settings?.allowBack}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestionIndex === visibleQuestions.length - 1 ? 'Complete' : 'Next'}
        </button>
      </div>

      {/* Debug info (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <p className="text-sm">Current Question: {currentQuestion.id}</p>
          <p className="text-sm">Visible Questions: {visibleQuestions.map(q => q.id).join(', ')}</p>
          <p className="text-sm">Total Questions: {allQuestions.length}</p>
          <details className="mt-2">
            <summary className="text-sm cursor-pointer">View Responses</summary>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(responses, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};
