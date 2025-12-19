'use client';

import React, { useState, useMemo, lazy, Suspense } from 'react';
import Link from 'next/link';
import { sampleSurvey } from '../data/sample-survey';
import { Question } from '../types/survey';

// Lazy load the SurveySection component for better performance
const SurveySection = lazy(() => import('../components/SurveySection').then(mod => ({ default: mod.SurveySection })));

// Loading fallback component
const SectionLoader = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
  </div>
);

export default function HomePage() {
  const survey = sampleSurvey;
  const [responses, setResponses] = useState<Record<string, any>>({});

  // Create a map of all questions for logic evaluation
  const allQuestions = useMemo(() => {
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
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  return (
    <div className="page-container">
      {/* Navigation Bar */}
      {/* <div className="mb-8 pb-4 border-b-2 border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Survey Authoring View</h1>
        </div>
        <Link
          href="/s/verizon-2025"
          className="button button-primary"
        >
          Take Survey →
        </Link>
      </div> */}

      {/* Page Title */}
      <h1 className="page-title">{survey.metadata.title}</h1>

      {/* Objectives Section */}
      <div className="mb-8">
        <h2 className="section-title">Objectives</h2>
        <ul className="list-disc list-inside space-y-2">
          {survey.metadata.objectives.map((objective, idx) => (
            <li key={idx} className="section-description">
              {objective}
            </li>
          ))}
        </ul>
      </div>

      {/* Audience Section */}
      <div className="mb-8">
        <h2 className="section-title">Audience</h2>
        <p className="section-description">
          {survey.metadata.audience.description}
        </p>
        <p className="section-description">
          Sample Size (N) = {survey.metadata.audience.sampleSize}
        </p>
        {survey.metadata.audience.quotas && survey.metadata.audience.quotas.length > 0 && (
          <div className="mt-2">
            <p className="section-description font-semibold">Quotas:</p>
            <ul className="list-disc list-inside ml-4">
              {survey.metadata.audience.quotas.map((quota, idx) => (
                <li key={idx} className="section-description">
                  {quota}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Questionnaire Label */}
      <h2 className="section-title mb-6">Questionnaire</h2>

      {/* Survey Sections with lazy loading */}
      <div>
        {survey.sections.map((section, idx) => (
          <Suspense key={section.id} fallback={<SectionLoader />}>
            <SurveySection
              section={section}
              sectionNumber={idx + 1}
              showBadges={true}
              showNotes={true}
              defaultExpanded={true}
              responses={responses}
              allQuestions={allQuestions}
              orderedQuestionIds={orderedQuestionIds}
              onResponseChange={handleResponseChange}
            />
          </Suspense>
        ))}
      </div>

      {/* Debug Panel (optional) */}
      {Object.keys(responses).length > 0 && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-2">Current Responses</h3>
          <p className="text-sm text-gray-600 mb-4">
            {Object.keys(responses).length} question{Object.keys(responses).length !== 1 ? 's' : ''} answered
          </p>
          <details>
            <summary className="cursor-pointer text-blue-600 hover:text-blue-700 text-sm">
              View All Responses
            </summary>
            <pre className="mt-2 text-xs bg-white p-4 rounded border border-gray-200 overflow-auto">
              {JSON.stringify(responses, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Survey Version {survey.metadata.version} • {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
