'use client';

import React, { useState, useEffect } from 'react';
import { Question, Option, MatrixRow } from '../types/survey';
import { useSurvey } from '../lib/survey-context';
import { applyPiping } from '../lib/logic-evaluator';
import { filterMatrixRows, filterOptions } from '../lib/masking';

interface MultiGridRendererProps {
  question: Question;
  allQuestions?: Question[];
  isFirstVisit?: boolean;
}

type GridValue = Record<string, Record<string | number, boolean>>;

export const MultiGridRenderer: React.FC<MultiGridRendererProps> = ({
  question,
  allQuestions,
  isFirstVisit
}) => {
  const { responses, setResponse } = useSurvey();
  const [gridValue, setGridValue] = useState<GridValue>({});
  const [error, setError] = useState<string>('');

  const questionText = applyPiping(question.text, responses, allQuestions);
  const metadata = question.metadata || {};
  const selectionMode = metadata.selectionMode || 'single';
  const columnExclusiveOptions = new Set(metadata.columnExclusiveOptions || []);
  const maxPerColumn = metadata.maxPerColumn;
  const exclusiveRowIds = new Set(metadata.exclusiveRowIds || []);

  const filteredRows = filterMatrixRows(question.matrixRows || [], responses);
  const filteredColumns = filterOptions(question.matrixColumns || [], responses);

  useEffect(() => {
    const storedValue = responses[question.id];
    if (storedValue && typeof storedValue === 'object' && !isFirstVisit) {
      setGridValue(storedValue);
    }
  }, [question.id, responses, isFirstVisit]);

  const handleCellChange = (rowId: string, colId: string | number, checked: boolean) => {
    let newValue = { ...gridValue };
    
    if (!newValue[rowId]) {
      newValue[rowId] = {};
    }

    const isExclusive = columnExclusiveOptions.has(colId);
    const isExclusiveRow = exclusiveRowIds.has(rowId);

    if (isExclusiveRow && checked) {
      newValue = {};
      newValue[rowId] = { [colId]: true };
    } else if (checked) {
      for (const exRowId of exclusiveRowIds) {
        delete newValue[exRowId];
      }

      if (selectionMode === 'single') {
        newValue[rowId] = { [colId]: true };
      } else {
        if (isExclusive) {
          newValue[rowId] = { [colId]: true };
        } else {
          const currentSelections = Object.entries(newValue[rowId] || {})
            .filter(([cId, val]) => val === true && !columnExclusiveOptions.has(cId))
            .map(([cId]) => cId);
          
          if (maxPerColumn !== undefined && currentSelections.length >= maxPerColumn) {
            setError(`You can select a maximum of ${maxPerColumn} option${maxPerColumn === 1 ? '' : 's'} per row`);
            return;
          }

          const cleaned: Record<string | number, boolean> = {};
          for (const [cId, val] of Object.entries(newValue[rowId] || {})) {
            if (val === true && !columnExclusiveOptions.has(cId)) {
              cleaned[cId] = true;
            }
          }
          cleaned[colId] = true;
          newValue[rowId] = cleaned;
        }
      }
    } else {
      delete newValue[rowId][colId];
    }

    setGridValue(newValue);
    setResponse(question.id, newValue);
    setError('');

    if (metadata.cellTerminations) {
      const termination = metadata.cellTerminations.find(
        (t: { rowId: string; columnId: string | number }) => t.rowId === rowId && t.columnId === colId
      );
      if (termination && checked) {
        setResponse(`${question.id}_terminate`, termination.destination || 'TERMINATE');
      }
    }
  };

  const isCellSelected = (rowId: string, colId: string | number): boolean => {
    return gridValue[rowId]?.[colId] === true;
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
                <th 
                  key={col.id} 
                  className="border-2 border-gray-300 p-3 bg-gray-50 text-center text-xs font-medium min-w-[100px]"
                >
                  {col.label}
                  {columnExclusiveOptions.has(col.id) && (
                    <span className="block text-[10px] text-gray-500">(exclusive)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="border-2 border-gray-300 p-3 text-sm font-medium bg-gray-50">
                  {row.label}
                </td>
                {filteredColumns.map((col) => (
                  <td 
                    key={`${row.id}-${col.id}`} 
                    className="border-2 border-gray-300 p-3 text-center"
                  >
                    <input
                      type={selectionMode === 'single' ? 'radio' : 'checkbox'}
                      name={selectionMode === 'single' ? `${question.id}-${row.id}` : undefined}
                      checked={isCellSelected(row.id, col.id)}
                      onChange={(e) => handleCellChange(row.id, col.id, e.target.checked)}
                      className={selectionMode === 'single' ? 'radio-button' : 'checkbox'}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};
