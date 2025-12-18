'use client';

import React from 'react';

interface SurveyTimerProps {
  formattedTime: string;
  percentageRemaining: number;
  isExpired: boolean;
}

export const SurveyTimer: React.FC<SurveyTimerProps> = ({
  formattedTime,
  percentageRemaining,
  isExpired
}) => {
  // Determine color based on remaining time
  const getColorClass = () => {
    if (isExpired) return 'text-red-600 border-red-600 bg-red-50';
    if (percentageRemaining < 10) return 'text-red-600 border-red-400 bg-red-50';
    if (percentageRemaining < 25) return 'text-orange-600 border-orange-400 bg-orange-50';
    return 'text-blue-600 border-blue-400 bg-blue-50';
  };

  const getProgressBarColor = () => {
    if (isExpired) return 'bg-red-600';
    if (percentageRemaining < 10) return 'bg-red-500';
    if (percentageRemaining < 25) return 'bg-orange-500';
    return 'bg-blue-600';
  };

  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border-2 shadow-lg ${getColorClass()} z-50`}>
      <div className="flex items-center gap-3">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <div className="text-xs font-semibold uppercase opacity-75">
            {isExpired ? 'Time Expired' : 'Time Remaining'}
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {formattedTime}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {!isExpired && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-1000 ${getProgressBarColor()}`}
            style={{ width: `${percentageRemaining}%` }}
          />
        </div>
      )}

      {/* Warning message */}
      {isExpired && (
        <p className="text-xs mt-2">
          Survey is being submitted automatically...
        </p>
      )}
      {!isExpired && percentageRemaining < 10 && (
        <p className="text-xs mt-2 font-semibold">
          Less than 10% time remaining!
        </p>
      )}
    </div>
  );
};
