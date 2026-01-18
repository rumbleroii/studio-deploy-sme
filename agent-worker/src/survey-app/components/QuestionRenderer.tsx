'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Question } from '../types/survey';
import { useSurvey } from '../lib/survey-context';
import { applyPiping } from '../lib/logic-evaluator';
import { applyOptionOrdering } from '../lib/ordering';
import { filterOptions, filterMatrixRows, generateDynamicOptions, generateDynamicRows } from '../lib/masking';
import { MultiGridRenderer } from './MultiGridRenderer';
import { RankingRenderer } from './RankingRenderer';

interface QuestionRendererProps {
  question: Question;
  onComplete: (value: any) => void;
  allQuestions?: Question[];
  isFirstVisit?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  onComplete,
  allQuestions,
  isFirstVisit
}) => {
  const { responses, setResponse, visitedQuestions } = useSurvey();
  const [currentValue, setCurrentValue] = useState<any>('');
  const [error, setError] = useState<string>('');
  const [otherTextValues, setOtherTextValues] = useState<Record<string, string>>({});
  const [exclusiveSelected, setExclusiveSelected] = useState<boolean>(false);
  const [terminationWarning, setTerminationWarning] = useState<string>('');

  const questionText = applyPiping(question.text, responses, allQuestions);

  const orderedOptions = useMemo(() => {
    const metadata = question.metadata || {};

    // Check if options should be dynamically generated from another question
    if (metadata.pipeOptionsFrom) {
      const sourceQuestion = allQuestions?.find(q => q.id === metadata.pipeOptionsFrom?.sourceQuestionId);
      const dynamicOptions = generateDynamicOptions(
        metadata.pipeOptionsFrom,
        responses,
        sourceQuestion,
        allQuestions
      );

      // Apply ordering to dynamically generated options
      return applyOptionOrdering(
        dynamicOptions,
        metadata.ordering,
        {
          randomize: metadata.randomize,
          anchor: metadata.anchor,
          exclusiveOptions: metadata.exclusiveOptions,
          hasOtherOption: metadata.hasOtherOption,
          otherOptionId: metadata.otherOptionId,
        },
        responses['_respondentId']
      );
    }

    // Normal static options
    if (!question.options) return [];
    const filteredOpts = filterOptions(question.options, responses);
    return applyOptionOrdering(
      filteredOpts,
      metadata.ordering,
      {
        randomize: metadata.randomize,
        anchor: metadata.anchor,
        exclusiveOptions: metadata.exclusiveOptions,
        hasOtherOption: metadata.hasOtherOption,
        otherOptionId: metadata.otherOptionId,
      },
      responses['_respondentId']
    );
  }, [question.options, question.metadata, responses, allQuestions]);

  useEffect(() => {
    const storedValue = responses[question.id];
    const storedExclusive = responses[`${question.id}_exclusive`];
    const shouldPreFill = isFirstVisit === false || (isFirstVisit === undefined && storedValue !== undefined);

    if (storedValue && shouldPreFill) {
      setCurrentValue(storedValue);
      setExclusiveSelected(false);
    } else if (storedExclusive === true && shouldPreFill) {
      setCurrentValue('');
      setExclusiveSelected(true);
    } else if (!shouldPreFill && storedValue === undefined) {
      setCurrentValue('');
      setExclusiveSelected(false);
    } else if (storedValue !== undefined) {
      setCurrentValue(storedValue);
      setExclusiveSelected(false);
    }
  }, [question.id, responses, isFirstVisit]);

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

    const metadata = question.metadata || {};
    const inputType = metadata.inputType as string | undefined;
    if (value && inputType) {
      switch (inputType) {
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

  const checkTerminationPattern = (value: string) => {
    const metadata = question.metadata || {};
    if (metadata.terminationPattern && typeof value === 'string') {
      const pattern = new RegExp(metadata.terminationPattern, 'i');
      if (pattern.test(value)) {
        setTerminationWarning(metadata.terminationWarning || 'Warning: This response may end the survey');
        return true;
      }
    }
    setTerminationWarning('');
    return false;
  };

  const handleChange = (value: any) => {
    setCurrentValue(value);
    setResponse(question.id, value);
    setError('');

    if (question.type === 'text' && typeof value === 'string') {
      checkTerminationPattern(value);
    }

    if (value && exclusiveSelected) {
      setExclusiveSelected(false);
      setResponse(`${question.id}_exclusive`, undefined);
    }
  };

  const handleExclusiveToggle = () => {
    const newExclusiveState = !exclusiveSelected;
    setExclusiveSelected(newExclusiveState);

    if (newExclusiveState) {
      setCurrentValue('');
      setResponse(question.id, '');
      setResponse(`${question.id}_exclusive`, true);
      setError('');
    } else {
      setResponse(`${question.id}_exclusive`, undefined);
    }
  };

  const handleBlur = () => {
    const metadata = question.metadata || {};
    let valueToValidate = currentValue;

    if (question.type === 'text' && metadata.trimWhitespace !== false) {
      valueToValidate = currentValue?.trim();
      if (valueToValidate !== currentValue) {
        setCurrentValue(valueToValidate);
        setResponse(question.id, valueToValidate);
      }
    }

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

  const handleMultipleChoiceChange = (optionValue: string | number) => {
    const current = Array.isArray(currentValue) ? currentValue : [];
    const metadata = question.metadata || {};
    const exclusiveOptions = metadata.exclusiveOptions || [];
    const maxSelections = metadata.maxSelections;

    const availableOptions = question.options || [];

    // Use loose equality to find option regardless of type
    const clickedOption = availableOptions.find((opt: any) => String(opt.value) === String(optionValue));
    const clickedOptionId = clickedOption ? Number(clickedOption.id) : null;

    const isExclusive = clickedOptionId !== null && exclusiveOptions.includes(clickedOptionId);

    let newValue: (string | number)[];

    // Check if value exists using loose comparison
    const valueExists = current.some(v => String(v) === String(optionValue));

    if (valueExists) {
      newValue = current.filter(v => v !== optionValue);
      if (error && error.includes('maximum')) {
        setError('');
      }
    } else {
      if (isExclusive) {
        newValue = [optionValue];
        
        if (metadata.hasOtherOption) {
          const clearedOtherTextValues: Record<string, string> = {};
          setOtherTextValues(clearedOtherTextValues);
          availableOptions.forEach((opt: any) => {
            if (String(opt.id) === String(metadata.otherOptionId)) {
              setResponse(`${question.id}_other_${opt.value}`, undefined);
            }
          });
        }
      } else {
        const nonExclusiveValues = current.filter(v => {
          const opt = availableOptions.find((o: any) => String(o.value) === String(v));
          const optId = opt ? Number(opt.id) : null;
          return optId === null || !exclusiveOptions.includes(optId);
        });
        
        if (maxSelections !== undefined && nonExclusiveValues.length >= maxSelections) {
          setError(`You can select a maximum of ${maxSelections} option${maxSelections === 1 ? '' : 's'}`);
          return;
        }
        
        newValue = [...nonExclusiveValues, optionValue];
      }
    }

    if (metadata.hasOtherOption && clickedOptionId !== null && String(clickedOptionId) === String(metadata.otherOptionId)) {
      if (!newValue.includes(optionValue)) {
        const newOtherTextValues = { ...otherTextValues };
        delete newOtherTextValues[optionValue];
        setOtherTextValues(newOtherTextValues);
        setResponse(`${question.id}_other_${optionValue}`, undefined);
      }
    }

    handleChange(newValue);
  };

  const handleOtherTextChange = (optionValue: string, text: string) => {
    setOtherTextValues({ ...otherTextValues, [optionValue]: text });
    setResponse(`${question.id}_other_${optionValue}`, text);
  };

  const handleOtherTextBlur = (optionValue: string) => {
    const currentText = otherTextValues[optionValue] || '';
    const trimmedText = currentText.trim();

    if (trimmedText !== currentText) {
      setOtherTextValues({ ...otherTextValues, [optionValue]: trimmedText });
      setResponse(`${question.id}_other_${optionValue}`, trimmedText);
    }
  };

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

  if (question.type === 'multi_grid') {
    return (
      <MultiGridRenderer
        question={question}
        allQuestions={allQuestions}
        isFirstVisit={isFirstVisit}
      />
    );
  }

  if (question.type === 'ranking') {
    return (
      <RankingRenderer
        question={question}
        allQuestions={allQuestions}
        isFirstVisit={isFirstVisit}
      />
    );
  }

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
          {orderedOptions.map((option) => {
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
                      // Use the original option.value to preserve type (e.g., number vs string)
                      handleChange(option.value);
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

  if (question.type === 'multiple_choice' && question.options) {
    const metadata = question.metadata || {};
    const hasOtherOption = metadata.hasOtherOption;
    const otherOptionId = metadata.otherOptionId;

    if (orderedOptions.length === 0) {
      return (
        <div className="space-y-4">
          <div className="question-text mb-6">
            {questionText}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </div>
          <p className="text-gray-500 italic">No options available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        <div className="space-y-3">
          {orderedOptions.map((option) => {
            const isOtherOption = hasOtherOption && String(option.id) === String(otherOptionId);
            // Check selection using loose comparison to handle type differences
            const isSelected = Array.isArray(currentValue) && currentValue.some(v => String(v) === String(option.value));

            return (
              <div key={option.id}>
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-[#3D1C35] transition-colors">
                  <input
                    type="checkbox"
                    value={String(option.value)}
                    checked={isSelected}
                    onChange={() => handleMultipleChoiceChange(option.value)}
                    className="checkbox flex-shrink-0"
                  />
                  <span className="option-text ml-4">{option.label}</span>
                </label>

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

  if (question.type === 'matrix' && question.matrixColumns) {
    const metadata = question.metadata || {};

    // Check if rows should be dynamically generated from another question
    let matrixRows = question.matrixRows || [];
    if (metadata.pipeRowsFrom) {
      const sourceQuestion = allQuestions?.find(q => q.id === metadata.pipeRowsFrom?.sourceQuestionId);
      matrixRows = generateDynamicRows(
        metadata.pipeRowsFrom,
        responses,
        sourceQuestion,
        allQuestions
      );
    }

    const filteredRows = filterMatrixRows(matrixRows, responses);
    const filteredColumns = filterOptions(question.matrixColumns, responses);
    const rowOtherSpecify = metadata.rowOtherSpecify || [];
    
    const getOtherSpecify = (rowId: string) => {
      return rowOtherSpecify.find((spec: { rowId: string }) => spec.rowId === rowId);
    };
    
    const isRowAnswered = (rowId: string): boolean => {
      return currentValue?.[rowId] !== undefined && currentValue?.[rowId] !== null;
    };
    
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
                {filteredColumns.map((col) => (
                  <th key={col.id} className="border-2 border-gray-300 p-3 bg-gray-50 text-center text-xs font-medium min-w-[100px]">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const rowValue = currentValue?.[row.id];
                const otherSpec = getOtherSpecify(row.id);
                const showOtherInput = otherSpec && isRowAnswered(row.id);
                
                return (
                  <React.Fragment key={row.id}>
                    <tr>
                      <td className="border-2 border-gray-300 p-3 text-sm font-medium bg-gray-50">{row.label}</td>
                      {filteredColumns.map((col) => (
                        <td key={`${row.id}-${col.id}`} className="border-2 border-gray-300 p-3 text-center">
                          <input
                            type="radio"
                            name={`${question.id}-${row.id}`}
                            value={col.value}
                            checked={rowValue === col.value}
                            onChange={(e) => {
                              // Use the original col.value to preserve type
                              const newValue = { ...(currentValue || {}), [row.id]: col.value };
                              handleChange(newValue);
                            }}
                            className="radio-button"
                          />
                        </td>
                      ))}
                    </tr>
                    {showOtherInput && (
                      <tr>
                        <td colSpan={filteredColumns.length + 1} className="border-2 border-gray-300 p-3">
                          <input
                            type="text"
                            value={otherTextValues[row.id] || ''}
                            onChange={(e) => handleOtherTextChange(row.id, e.target.value)}
                            onBlur={() => handleOtherTextBlur(row.id)}
                            placeholder={otherSpec.placeholder || 'Please specify'}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#3D1C35] focus:outline-none"
                          />
                          {otherSpec.required && (
                            <p className="text-xs text-gray-500 mt-1">* Required</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (question.type === 'text') {
    const metadata = question.metadata || {};
    const textInputType = (metadata.inputType || 'text') as string;
    const placeholder = metadata.placeholder || 'Enter your response...';
    const maxLength = metadata.maxLength;

    if (textInputType === 'textarea') {
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
            disabled={exclusiveSelected}
          />
          {metadata.showCharCount && maxLength && (
            <p className="text-xs text-gray-500 text-right">
              {currentValue?.length || 0} / {maxLength}
            </p>
          )}

          {terminationWarning && (
            <div className="mt-2 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm">
              {terminationWarning}
            </div>
          )}

          {metadata.exclusiveOption && (
            <div className="mt-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exclusiveSelected}
                  onChange={handleExclusiveToggle}
                  className="checkbox"
                />
                <span className="ml-2 text-sm text-gray-700">{metadata.exclusiveOption}</span>
              </label>
            </div>
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
          type={textInputType}
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="text-input"
          placeholder={placeholder}
          maxLength={maxLength}
          min={metadata.min}
          max={metadata.max}
          disabled={exclusiveSelected}
        />

        {terminationWarning && (
          <div className="mt-2 p-3 bg-amber-50 border-l-4 border-amber-500 text-amber-700 text-sm">
            {terminationWarning}
          </div>
        )}

        {metadata.exclusiveOption && (
          <div className="mt-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={exclusiveSelected}
                onChange={handleExclusiveToggle}
                className="checkbox"
              />
              <span className="ml-2 text-sm text-gray-700">{metadata.exclusiveOption}</span>
            </label>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (question.type === 'numeric') {
    const metadata = question.metadata || {};

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
          disabled={exclusiveSelected}
        />

        {metadata.exclusiveOption && (
          <div className="mt-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={exclusiveSelected}
                onChange={handleExclusiveToggle}
                className="checkbox"
              />
              <span className="ml-2 text-sm text-gray-700">{metadata.exclusiveOption}</span>
            </label>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  if (question.type === 'rating') {
    const metadata = question.metadata || {};
    const scale = metadata.scale || { min: 1, max: 5 };
    const scalePoints = [];
    for (let i = scale.min; i <= scale.max; i++) {
      scalePoints.push(i);
    }

    return (
      <div className="space-y-4">
        <div className="question-text mb-6">
          {questionText}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </div>

        {(scale.minLabel || scale.maxLabel) && (
          <div className="flex justify-between text-sm text-gray-600 mb-4 px-2">
            <span className="max-w-[40%] text-left">{scale.minLabel || ''}</span>
            <span className="max-w-[40%] text-right">{scale.maxLabel || ''}</span>
          </div>
        )}

        <div className="flex justify-between items-center gap-2">
          {scalePoints.map((point) => (
            <label
              key={point}
              className={`flex-1 flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                currentValue === point
                  ? 'border-[#3D1C35] bg-[#F5E6F0]'
                  : 'border-gray-200 hover:border-[#3D1C35]'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={point}
                checked={currentValue === point}
                onChange={() => handleChange(point)}
                className="sr-only"
              />
              <span className={`text-lg font-medium ${
                currentValue === point ? 'text-[#3D1C35]' : 'text-gray-700'
              }`}>
                {point}
              </span>
            </label>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return <div>Unknown question type: {question.type}</div>;
};
