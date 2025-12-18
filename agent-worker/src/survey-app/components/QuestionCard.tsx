import React, { useState } from 'react';
import { Question } from '../types/survey';
import { Badge, BadgeGroup } from './Badge';

interface QuestionCardProps {
  question: Question;
  showBadges?: boolean;
  showNotes?: boolean;
  onChange?: (questionId: string, value: any) => void;
  value?: any;
}

const getQuestionTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    introduction: 'Introduction Screen',
    single_choice: 'Single Choice',
    multiple_choice: 'Multiple Choice',
    matrix: 'Matrix/Grid',
    text: 'Open Text',
    numeric: 'Numeric',
    rating: 'Rating Scale'
  };
  return typeMap[type] || type;
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  showBadges = true,
  showNotes = true,
  onChange,
  value: externalValue
}) => {
  const [internalValue, setInternalValue] = useState<any>(null);
  const hasLogic = question.logic && question.logic.length > 0;
  const hasMetadata = question.metadata && Object.keys(question.metadata).length > 0;

  // Use external value if provided, otherwise use internal state
  const currentValue = externalValue !== undefined ? externalValue : internalValue;

  const handleChange = (newValue: any) => {
    if (onChange) {
      onChange(question.id, newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <div className="card question-spacing">
      {/* Question ID and Type Badges */}
      {showBadges && (
        <BadgeGroup>
          <Badge type="question-id">{question.id}</Badge>
          <Badge type="question-type">{getQuestionTypeLabel(question.type)}</Badge>
        </BadgeGroup>
      )}

      {/* Question Text */}
      <div className="question-text mb-4">
        {question.text}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </div>

      {/* Question Description */}
      {question.description && (
        <div className="section-description mb-4">
          {question.description}
        </div>
      )}

      {/* Options for single/multiple choice */}
      {(question.type === 'single_choice' || question.type === 'multiple_choice') && question.options && (
        <div className="space-y-2">
          {question.options.map((option) => {
            const isChecked = question.type === 'single_choice'
              ? currentValue === option.value
              : Array.isArray(currentValue) && currentValue.includes(option.value);

            return (
              <div key={option.id} className="flex items-center option-spacing">
                <input
                  type={question.type === 'single_choice' ? 'radio' : 'checkbox'}
                  name={question.id}
                  value={option.value}
                  id={`${question.id}-${option.id}`}
                  className={question.type === 'single_choice' ? 'radio-button' : 'checkbox'}
                  checked={isChecked}
                  onChange={(e) => {
                    if (question.type === 'single_choice') {
                      handleChange(option.value);
                    } else {
                      const currentArray = Array.isArray(currentValue) ? currentValue : [];
                      if (e.target.checked) {
                        handleChange([...currentArray, option.value]);
                      } else {
                        handleChange(currentArray.filter((v) => v !== option.value));
                      }
                    }
                  }}
                />
                <label htmlFor={`${question.id}-${option.id}`} className="option-text ml-3">
                  {option.label}
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* Matrix question */}
      {question.type === 'matrix' && question.matrixRows && question.matrixColumns && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-50 text-left text-sm font-semibold"></th>
                {question.matrixColumns.map((col) => (
                  <th key={col.id} className="border border-gray-300 p-2 bg-gray-50 text-center text-xs font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {question.matrixRows.map((row) => {
                const matrixValue = currentValue || {};
                const rowValue = matrixValue[row.id];

                return (
                  <tr key={row.id}>
                    <td className="border border-gray-300 p-2 text-sm font-medium">{row.label}</td>
                    {question.matrixColumns?.map((col) => (
                      <td key={`${row.id}-${col.id}`} className="border border-gray-300 p-2 text-center">
                        <input
                          type="radio"
                          name={`${question.id}-${row.id}`}
                          value={col.value}
                          className="radio-button"
                          checked={rowValue === col.value}
                          onChange={() => {
                            handleChange({
                              ...matrixValue,
                              [row.id]: col.value
                            });
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Text input */}
      {question.type === 'text' && (
        <input
          type="text"
          className="text-input"
          placeholder="Enter your response..."
          value={currentValue || ''}
          onChange={(e) => handleChange(e.target.value)}
        />
      )}

      {/* Numeric input */}
      {question.type === 'numeric' && (
        <input
          type="number"
          className="text-input"
          placeholder="Enter a number..."
          value={currentValue || ''}
          onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
        />
      )}

      {/* Logic and Metadata Badges */}
      {showBadges && (hasLogic || hasMetadata || question.defaultNextQuestion) && (
        <div className="mt-4">
          <BadgeGroup>
            {question.defaultNextQuestion && (
              <Badge type="logic-default">
                Default → {question.defaultNextQuestion}
              </Badge>
            )}
            {hasLogic && question.logic?.map((logic, idx) => (
              <Badge key={idx} type="logic-conditional">
                {logic.action === 'show' ? 'SHOW' : logic.action === 'terminate' ? 'TERMINATE' : 'SKIP'} IF [{logic.when.left} {logic.when.operator} {JSON.stringify(logic.when.right)}]
                {logic.destination && ` → ${logic.destination}`}
              </Badge>
            ))}
            {question.metadata?.randomize && (
              <Badge type="randomized" icon="🔀">
                Randomized{question.metadata.anchor && ` (anchored: ${question.metadata.anchor.join(',')})`}
              </Badge>
            )}
            {question.metadata?.piping && (
              <Badge type="dynamic" icon="📊">
                Piping: {question.metadata.piping.join(', ')}
              </Badge>
            )}
          </BadgeGroup>
        </div>
      )}

      {/* Notes Section */}
      {showNotes && question.notes && question.notes.length > 0 && (
        <div className="notes-section">
          <div className="note-text font-semibold mb-2">Notes:</div>
          <ul className="list-disc list-inside space-y-1">
            {question.notes.map((note, idx) => (
              <li key={idx} className="note-text">{note}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
