'use client';

import React, { useState, useEffect } from 'react';
import { Question } from '../types/survey';
import { useSurvey } from '../lib/survey-context';
import { applyPiping } from '../lib/logic-evaluator';

interface QuestionRendererProps {
  question: Question;
  onComplete: (value: any) => void;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  onComplete
}) => {
  const { responses, setResponse } = useSurvey();
  const [currentValue, setCurrentValue] = useState<any>(responses[question.id] || '');
  const [error, setError] = useState<string>('');

  // Apply piping to question text
  const questionText = applyPiping(question.text, responses);

  useEffect(() => {
    // Load existing response if any
    if (responses[question.id]) {
      setCurrentValue(responses[question.id]);
    }
  }, [question.id, responses]);

  const handleChange = (value: any) => {
    setCurrentValue(value);
    setResponse(question.id, value);
    setError('');
  };

  const handleMultipleChoiceChange = (optionValue: string) => {
    const current = Array.isArray(currentValue) ? currentValue : [];
    const newValue = current.includes(optionValue)
      ? current.filter(v => v !== optionValue)
      : [...current, optionValue];
    handleChange(newValue);
  };

  // Introduction screen
  if (question.type === 'introduction') {
    return (
      <div className="space-y-6">
        <div className="prose max-w-none">
          <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
            {questionText}
          </p>
        </div>
      </div>
    );
  }

  // Single choice
  if (question.type === 'single_choice' && question.options) {
    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <div className="space-y-3">
          {question.options.map((option) => (
            <label
              key={option.id}
              className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#3D1C35] transition-colors"
            >
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={currentValue === option.value}
                onChange={(e) => handleChange(e.target.value)}
                className="radio-button flex-shrink-0"
              />
              <span className="option-text ml-4">{option.label}</span>
            </label>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Multiple choice
  if (question.type === 'multiple_choice' && question.options) {
    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <div className="space-y-3">
          {question.options.map((option) => (
            <label
              key={option.id}
              className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#3D1C35] transition-colors"
            >
              <input
                type="checkbox"
                value={option.value}
                checked={Array.isArray(currentValue) && currentValue.includes(option.value)}
                onChange={() => handleMultipleChoiceChange(option.value as string)}
                className="checkbox flex-shrink-0"
              />
              <span className="option-text ml-4">{option.label}</span>
            </label>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Matrix question
  if (question.type === 'matrix' && question.matrixRows && question.matrixColumns) {
    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-2 border-gray-300 p-3 bg-gray-50 text-left text-sm font-semibold"></th>
                {question.matrixColumns.map((col) => (
                  <th key={col.id} className="border-2 border-gray-300 p-3 bg-gray-50 text-center text-xs font-medium min-w-[100px]">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.matrixRows.map((row) => {
                const rowValue = currentValue?.[row.id];
                return (
                  <tr key={row.id}>
                    <td className="border-2 border-gray-300 p-3 text-sm font-medium bg-gray-50">{row.label}</td>
                    {question.matrixColumns?.map((col) => (
                      <td key={`${row.id}-${col.id}`} className="border-2 border-gray-300 p-3 text-center">
                        <input
                          type="radio"
                          name={`${question.id}-${row.id}`}
                          value={col.value}
                          checked={rowValue === col.value}
                          onChange={(e) => {
                            const newValue = { ...(currentValue || {}), [row.id]: e.target.value };
                            handleChange(newValue);
                          }}
                          className="radio-button"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Text input
  if (question.type === 'text') {
    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <textarea
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          className="text-input min-h-[120px] resize-y"
          placeholder="Enter your response..."
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Numeric input
  if (question.type === 'numeric') {
    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <input
          type="number"
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          className="text-input"
          placeholder="Enter a number..."
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return <div>Unknown question type: {question.type}</div>;
};
