'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useSurvey } from '../../../../lib/survey-context';

export default function CompletePage() {
  const { clearResponses } = useSurvey();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('timeout') === 'true';

  const handleStartNew = () => {
    clearResponses();
    window.location.href = '/s/preview';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Thank You Message */}
          <h1 className="page-title mb-6">
            {isTimeout ? 'Time Expired' : 'Thank You!'}
          </h1>

          <div className="space-y-4 text-gray-600">
            {isTimeout ? (
              <>
                <p className="text-lg">
                  The survey time limit has been reached and your responses have been automatically submitted.
                </p>
                <p>
                  Thank you for your participation. The responses you provided have been recorded
                  and will be used in our analysis.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg">
                  Your responses have been successfully recorded.
                </p>
                <p>
                  We greatly appreciate the time you took to complete this survey.
                  Your feedback is valuable and will help us better understand business wireless needs.
                </p>
              </>
            )}

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6 text-left">
              <p className="text-sm text-blue-700">
                <strong>What happens next:</strong> Your responses will be analyzed along with others
                to identify trends and insights that will help shape future service offerings.
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartNew}
            className="button button-secondary mt-8"
          >
            Return to Home
          </button>

          {/* Footer */}
          <div className="mt-8 text-sm text-gray-500">
            <p>If you have any questions, please contact our research team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
