'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { sampleSurvey } from '../../data/sample-survey';
import { useSurvey } from '../../lib/survey-context';
import { isProduction, clearRespondentId } from '../../lib/api';

export default function SurveyWelcome() {
  const router = useRouter();
  const { clearResponses } = useSurvey();
  const survey = sampleSurvey;

  const handleStart = () => {
    // Clear any previous responses
    clearResponses();

    // Clear respondent ID (production mode only)
    if (isProduction) {
      clearRespondentId();
    }

    // Navigate to first question
    const firstQuestion = survey.sections[0].questions[0];
    router.push(`/survey/question?q=${firstQuestion.id}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          {/* Survey Title */}
          <h1 className="page-title mb-6">{survey.metadata.title}</h1>

          {/* Welcome Message */}
          <div className="space-y-4 mb-8 text-left">
            <p className="text-lg text-gray-700">
              Welcome and thank you for participating in our survey.
            </p>

            <p className="text-gray-600">
              {survey.metadata.description}
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
              <p className="text-sm text-blue-700">
                <strong>Please note:</strong> Your responses will be kept confidential and used for research purposes only.
              </p>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="button button-primary text-lg px-8 py-4"
          >
            Start Survey
          </button>

          {/* Footer Info */}
          <div className="mt-8 text-sm text-gray-500">
            <p>{survey.sections.reduce((acc, section) => acc + section.questions.length, 0)} questions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
