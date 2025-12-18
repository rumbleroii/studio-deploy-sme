'use client';

import React, { useState, useMemo } from 'react';
import { Survey, Question, Section } from '../types/survey';
import { QuestionCard } from './QuestionCard';
import { shouldShowQuestion } from '../utils/logicEvaluator';

interface InteractiveSurveyAllProps {
  survey: Survey;
  onChange?: (responses: Record<string, any>) => void;
  showBadges?: boolean;
  showNotes?: boolean;
}

/**
 * Interactive survey component that displays all questions at once
 * Questions appear/disappear based on logic conditions as user interacts
 */
export const InteractiveSurveyAll: React.FC<InteractiveSurveyAllProps> = ({
  survey,
  onChange,
  showBadges = true,
  showNotes = true
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Create a map of all questions for quick lookup
  const questionMap = useMemo(() => {
    const map = new Map<string, Question>();
    survey.sections.forEach(section => {
      section.questions.forEach(q => map.set(q.id, q));
    });
    return map;
  }, [survey]);

  // Create ordered list of all question IDs
  const orderedQuestionIds = useMemo(() => {
    const ids: string[] = [];
    survey.sections.forEach(section => {
      section.questions.forEach(q => ids.push(q.id));
    });
    return ids;
  }, [survey]);

  // Handle response change
  const handleResponseChange = (questionId: string, value: any) => {
    const newResponses = {
      ...responses,
      [questionId]: value
    };
    setResponses(newResponses);
    onChange?.(newResponses);
  };

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  // Count visible questions in a section
  const getVisibleQuestionCount = (section: Section): number => {
    return section.questions.filter(question =>
      shouldShowQuestion(question.id, questionMap, responses, orderedQuestionIds)
    ).length;
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Survey Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4" style={{ fontSize: '32px', color: '#1A1A1A' }}>
          {survey.metadata.title}
        </h1>
        {survey.metadata.description && (
          <p className="text-gray-600 mb-6">{survey.metadata.description}</p>
        )}

        {/* Objectives */}
        {survey.metadata.objectives && survey.metadata.objectives.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Objectives</h2>
            <ul className="list-disc list-inside space-y-1">
              {survey.metadata.objectives.map((objective, idx) => (
                <li key={idx} className="text-gray-700">{objective}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Audience */}
        {survey.metadata.audience && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Audience</h2>
            <p className="text-gray-700">{survey.metadata.audience.description}</p>
            <p className="text-gray-600 text-sm mt-1">
              Sample Size: {survey.metadata.audience.sampleSize}
            </p>
          </div>
        )}
      </div>

      {/* Sections */}
      {survey.sections.map((section) => {
        const visibleQuestionCount = getVisibleQuestionCount(section);
        const isCollapsed = collapsedSections.has(section.id);

        return (
          <div key={section.id} className="mb-8">
            {/* Section Header */}
            <div
              className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => toggleSection(section.id)}
            >
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{section.title}</h2>
                {section.description && (
                  <p className="text-gray-600 mt-1">{section.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {visibleQuestionCount} question{visibleQuestionCount !== 1 ? 's' : ''}
                </span>
                <span className="text-2xl">
                  {isCollapsed ? '▶' : '▼'}
                </span>
              </div>
            </div>

            {/* Section Questions */}
            {!isCollapsed && (
              <div className="mt-4 space-y-6">
                {section.questions.map((question) => {
                  const isVisible = shouldShowQuestion(question.id, questionMap, responses, orderedQuestionIds);

                  if (!isVisible) {
                    return null;
                  }

                  return (
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
                        onChange={handleResponseChange}
                        showBadges={showBadges}
                        showNotes={showNotes}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Progress Summary */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold mb-2">Progress</h3>
        <p className="text-gray-700">
          Answered: {Object.keys(responses).length} question{Object.keys(responses).length !== 1 ? 's' : ''}
        </p>
        <details className="mt-4">
          <summary className="cursor-pointer text-blue-600 hover:text-blue-700">
            View Responses
          </summary>
          <div className="mt-2 p-4 bg-white rounded border border-gray-200">
            {Object.entries(responses).map(([questionId, value]) => {
              const question = questionMap.get(questionId);
              return (
                <div key={questionId} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
                  <span className="font-semibold">{questionId}</span>
                  {question && <span className="text-gray-600"> - {question.text}</span>}
                  <div className="text-sm text-gray-500 mt-1">
                    {Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>

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
