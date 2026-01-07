'use client';

import React, { useState, useEffect } from 'react';
import { Question } from '../types/survey';
import { useSurvey } from '../lib/survey-context';
import { applyPiping } from '../lib/logic-evaluator';

interface QuestionRendererProps {
  question: Question;
  onComplete: (value: any) => void;
  allQuestions?: Question[]; // Optional: for piping label lookups
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  onComplete,
  allQuestions
}) => {
  const { responses, setResponse } = useSurvey();
  const [currentValue, setCurrentValue] = useState<any>(responses[question.id] || '');
  const [error, setError] = useState<string>('');
  const [otherTextValues, setOtherTextValues] = useState<Record<string, string>>({});

  // Apply piping to question text
  const questionText = applyPiping(question.text, responses, allQuestions);

  useEffect(() => {
    // Load existing response or reset to empty value
    if (responses[question.id]) {
      setCurrentValue(responses[question.id]);
    } else {
      setCurrentValue('');
    }
  }, [question.id, responses]);

  const validateInput = (value: any): string | null => {
    if (!question.validation) return null;

    for (const rule of question.validation) {
      if (rule.type === 'required' && !value) {
        return rule.message || 'This field is required';
      }

      if (rule.type === 'min' && value.length < rule.value) {
        return rule.message || `Minimum ${rule.value} characters required`;
      }

      if (rule.type === 'max' && value.length > rule.value) {
        return rule.message || `Maximum ${rule.value} characters allowed`;
      }

      if (rule.type === 'pattern' && rule.value) {
        const regex = new RegExp(rule.value);
        if (!regex.test(value)) {
          return rule.message || 'Invalid format';
        }
      }
    }

    // Additional validation based on metadata.inputType
    const metadata = question.metadata || {};
    if (value && metadata.inputType) {
      switch (metadata.inputType) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          break;
        case 'tel':
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(value)) {
            return 'Please enter a valid phone number';
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            return 'Please enter a valid URL';
          }
          break;
        case 'number':
          if (isNaN(Number(value))) {
            return 'Please enter a valid number';
          }
          break;
      }
    }

    return null;
  };

  const handleChange = (value: any) => {
    setCurrentValue(value);
    setResponse(question.id, value);
    setError('');
  };

  const handleBlur = () => {
    const metadata = question.metadata || {};
    let valueToValidate = currentValue;

    // Trim whitespace if enabled (default: true for text inputs)
    if (question.type === 'text' && metadata.trimWhitespace !== false) {
      valueToValidate = currentValue?.trim();
      if (valueToValidate !== currentValue) {
        setCurrentValue(valueToValidate);
        setResponse(question.id, valueToValidate);
      }
    }

    // Reject whitespace-only input (default: true for text inputs)
    if (question.type === 'text' && metadata.rejectWhitespaceOnly !== false) {
      if (valueToValidate && !valueToValidate.trim()) {
        setError('Please enter valid text (not just spaces)');
        return;
      }
    }

    const validationError = validateInput(valueToValidate);
    if (validationError) {
      setError(validationError);
    }
  };

  const handleMultipleChoiceChange = (optionValue: string) => {
    const current = Array.isArray(currentValue) ? currentValue : [];
    const newValue = current.includes(optionValue)
      ? current.filter(v => v !== optionValue)
      : [...current, optionValue];

    // Clear "Other" text if deselected
    const metadata = question.metadata || {};
    if (metadata.hasOtherOption && String(metadata.otherOptionId) === optionValue) {
      if (!newValue.includes(optionValue)) {
        const newOtherTextValues = { ...otherTextValues };
        delete newOtherTextValues[optionValue];
        setOtherTextValues(newOtherTextValues);
      }
    }

    handleChange(newValue);
  };

  const handleOtherTextChange = (optionValue: string, text: string) => {
    setOtherTextValues({ ...otherTextValues, [optionValue]: text });
    // Store the other text in responses with a special key
    setResponse(`${question.id}_other_${optionValue}`, text);
  };

  const handleOtherTextBlur = (optionValue: string) => {
    // Trim whitespace on blur (as per Section 3.0 of survey-question-types.md)
    const currentText = otherTextValues[optionValue] || '';
    const trimmedText = currentText.trim();

    if (trimmedText !== currentText) {
      setOtherTextValues({ ...otherTextValues, [optionValue]: trimmedText });
      setResponse(`${question.id}_other_${optionValue}`, trimmedText);
    }
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
    const metadata = question.metadata || {};
    const hasOtherOption = metadata.hasOtherOption;
    const otherOptionId = metadata.otherOptionId;

    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <div className="space-y-3">
          {question.options.map((option) => {
            const isOtherOption = hasOtherOption && String(option.id) === String(otherOptionId);
            const isSelected = currentValue === option.value;

            return (
              <div key={option.id}>
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#3D1C35] transition-colors">
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={isSelected}
                    onChange={(e) => {
                      handleChange(e.target.value);
                      // Clear other text if switching away from Other option
                      if (!isOtherOption) {
                        const newOtherTextValues = { ...otherTextValues };
                        delete newOtherTextValues[String(option.value)];
                        setOtherTextValues(newOtherTextValues);
                      }
                    }}
                    className="radio-button flex-shrink-0"
                  />
                  <span className="option-text ml-4">{option.label}</span>
                </label>

                {/* Show text input if this is the "Other" option and it's selected */}
                {isOtherOption && isSelected && (
                  <div className="ml-12 mt-2">
                    <input
                      type="text"
                      value={otherTextValues[String(option.value)] || ''}
                      onChange={(e) => handleOtherTextChange(String(option.value), e.target.value)}
                      onBlur={() => handleOtherTextBlur(String(option.value))}
                      placeholder={metadata.otherInputPlaceholder || 'Please specify'}
                      maxLength={metadata.otherInputMaxLength || 100}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#3D1C35] focus:outline-none"
                      required={metadata.otherInputRequired}
                    />
                    {metadata.otherInputRequired && (
                      <p className="text-xs text-gray-500 mt-1">* Required when "Other" is selected</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // Multiple choice
  if (question.type === 'multiple_choice' && question.options) {
    const metadata = question.metadata || {};
    const hasOtherOption = metadata.hasOtherOption;
    const otherOptionId = metadata.otherOptionId;

    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <div className="space-y-3">
          {question.options.map((option) => {
            const isOtherOption = hasOtherOption && String(option.id) === String(otherOptionId);
            const isSelected = Array.isArray(currentValue) && currentValue.includes(option.value);

            return (
              <div key={option.id}>
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#3D1C35] transition-colors">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleMultipleChoiceChange(option.value as string)}
                    className="checkbox flex-shrink-0"
                  />
                  <span className="option-text ml-4">{option.label}</span>
                </label>

                {/* Show text input if this is the "Other" option and it's checked */}
                {isOtherOption && isSelected && (
                  <div className="ml-12 mt-2">
                    <input
                      type="text"
                      value={otherTextValues[String(option.value)] || ''}
                      onChange={(e) => handleOtherTextChange(String(option.value), e.target.value)}
                      onBlur={() => handleOtherTextBlur(String(option.value))}
                      placeholder={metadata.otherInputPlaceholder || 'Please specify'}
                      maxLength={metadata.otherInputMaxLength || 100}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#3D1C35] focus:outline-none"
                      required={metadata.otherInputRequired}
                    />
                    {metadata.otherInputRequired && (
                      <p className="text-xs text-gray-500 mt-1">* Required when "Other" is selected</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
    const metadata = question.metadata || {};
    const inputType = metadata.inputType || 'text';
    const placeholder = metadata.placeholder || 'Enter your response...';
    const maxLength = metadata.maxLength;

    // Use textarea for 'textarea' type, otherwise use input
    if (inputType === 'textarea') {
      return (
        <div className="space-y-4">
          <div className="question-text mb-6">
            {questionText}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </div>

          <textarea
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            className="text-input min-h-[120px] resize-y"
            placeholder={placeholder}
            maxLength={maxLength}
            rows={metadata.rows}
          />
          {metadata.showCharCount && maxLength && (
            <p className="text-xs text-gray-500 text-right">
              {currentValue?.length || 0} / {maxLength}
            </p>
          )}

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <input
          type={inputType}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="text-input"
          placeholder={placeholder}
          maxLength={maxLength}
          min={metadata.min}
          max={metadata.max}
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
