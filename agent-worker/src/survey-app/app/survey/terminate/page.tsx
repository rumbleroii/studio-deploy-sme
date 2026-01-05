'use client';

import React, { useEffect } from 'react';
import { useSurvey } from '../../../lib/survey-context';
import { isProduction, clearRespondentId } from '../../../lib/api';

export default function TerminatePage() {
  const { clearResponses } = useSurvey();

  // Clear respondent ID on mount (production mode only)
  useEffect(() => {
    if (isProduction) {
      clearRespondentId();
    }
  }, []);

  const handleReturn = () => {
    clearResponses();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          {/* Info Icon */}
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Message */}
          <h1 className="page-title mb-6">Survey Ended</h1>

          <div className="space-y-4 text-gray-600">
            <p className="text-lg">
              Thank you for your time.
            </p>

            <p>
              Based on your responses, you do not qualify for the remainder of this survey.
              We appreciate your willingness to participate.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={handleReturn}
            className="button button-secondary mt-8"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}
