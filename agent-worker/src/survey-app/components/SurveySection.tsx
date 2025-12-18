'use client';

import React, { useState, useMemo } from 'react';
import { Section, Question } from '../types/survey';
import { QuestionCard } from './QuestionCard';
import { shouldShowQuestion } from '../utils/logicEvaluator';

interface SurveySectionProps {
  section: Section;
  sectionNumber: number;
  showBadges?: boolean;
  showNotes?: boolean;
  defaultExpanded?: boolean;
  responses?: Record<string, any>;
  allQuestions?: Map<string, Question>;
  orderedQuestionIds?: string[];
  onResponseChange?: (questionId: string, value: any) => void;
}

export const SurveySection: React.FC<SurveySectionProps> = ({
  section,
  sectionNumber,
  showBadges = true,
  showNotes = true,
  defaultExpanded = true,
  responses = {},
  allQuestions,
  orderedQuestionIds,
  onResponseChange
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Filter visible questions based on logic evaluation
  const visibleQuestions = useMemo(() => {
    if (!allQuestions || !responses) {
      return section.questions;
    }
    return section.questions.filter(question =>
      shouldShowQuestion(question.id, allQuestions, responses, orderedQuestionIds)
    );
  }, [section.questions, allQuestions, responses, orderedQuestionIds]);

  const questionCount = visibleQuestions.length;
  const questionText = questionCount === 1 ? 'Question' : 'Questions';

  return (
    <div className="section-spacing">
      {/* Collapsible Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full section-card flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="section-title">
            Section {sectionNumber}: {section.title}
          </span>
          <span className="section-description">
            {questionCount} {questionText}
          </span>
        </div>
        <span className="text-2xl text-gray-600">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Section Description */}
      {isExpanded && section.description && (
        <div className="section-description px-6 py-2">
          {section.description}
        </div>
      )}

      {/* Questions */}
      {isExpanded && (
        <div className="px-6 space-y-4 mt-4">
          {visibleQuestions.map((question) => (
            <div
              key={question.id}
              className="transition-all duration-300 ease-in-out"
              style={{
                animation: 'fadeIn 0.3s ease-in-out'
              }}
            >
              <QuestionCard
                question={question}
                value={responses[question.id]}
                onChange={onResponseChange}
                showBadges={showBadges}
                showNotes={showNotes}
              />
            </div>
          ))}
        </div>
      )}

      {/* CSS for fade-in animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
