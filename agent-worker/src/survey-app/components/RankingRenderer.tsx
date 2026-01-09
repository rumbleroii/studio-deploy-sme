'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Question, Option } from '../types/survey';
import { useSurvey } from '../lib/survey-context';
import { applyPiping } from '../lib/logic-evaluator';
import { filterOptions } from '../lib/masking';
import { applyOptionOrdering } from '../lib/ordering';

interface RankingRendererProps {
  question: Question;
  allQuestions?: Question[];
  isFirstVisit?: boolean;
}

type RankingValue = Record<string | number, number | null>;

export const RankingRenderer: React.FC<RankingRendererProps> = ({
  question,
  allQuestions,
  isFirstVisit
}) => {
  const { responses, setResponse } = useSurvey();
  const [rankings, setRankings] = useState<RankingValue>({});
  const [error, setError] = useState<string>('');

  const questionText = applyPiping(question.text, responses, allQuestions);
  const metadata = question.metadata || {};
  const minRank = metadata.minRank;
  const maxRank = metadata.maxRank;
  const exactRank = metadata.exactRank;
  const uiMode = metadata.uiMode || 'number_input';

  const filteredOptions = useMemo(() => {
    if (!question.options) return [];
    const filtered = filterOptions(question.options, responses);
    return applyOptionOrdering(
      filtered,
      metadata.ordering,
      {
        randomize: metadata.randomize,
        anchor: metadata.anchor,
      },
      responses['_respondentId']
    );
  }, [question.options, metadata, responses]);

  useEffect(() => {
    const storedValue = responses[question.id];
    if (storedValue && typeof storedValue === 'object' && !isFirstVisit) {
      setRankings(storedValue);
    }
  }, [question.id, responses, isFirstVisit]);

  const handleRankChange = (optionValue: string | number, rank: number | null) => {
    const newRankings = { ...rankings };

    if (rank !== null) {
      const existingOption = Object.entries(newRankings).find(
        ([key, r]) => r === rank && key !== String(optionValue)
      );
      if (existingOption) {
        setError(`Rank ${rank} is already assigned to another option`);
        return;
      }

      const maxAllowed = exactRank || maxRank || filteredOptions.length;
      if (rank > maxAllowed) {
        setError(`Maximum rank allowed is ${maxAllowed}`);
        return;
      }
      if (rank < 1) {
        setError('Rank must be at least 1');
        return;
      }
    }

    newRankings[optionValue] = rank;
    setRankings(newRankings);
    setResponse(question.id, newRankings);
    setError('');
  };

  const getRankedCount = (): number => {
    return Object.values(rankings).filter(r => r !== null && r > 0).length;
  };

  return (
    <div className="space-y-4">
      <div className="question-text mb-6">
        {questionText}
        {question.required && <span className="text-red-500 ml-1">*</span>}
        {exactRank && (
          <span className="block text-sm text-gray-600 mt-1">
            Please rank exactly {exactRank} option{exactRank === 1 ? '' : 's'}
          </span>
        )}
        {!exactRank && maxRank && (
          <span className="block text-sm text-gray-600 mt-1">
            Please rank up to {maxRank} option{maxRank === 1 ? '' : 's'}
          </span>
        )}
        {!exactRank && minRank && (
          <span className="block text-sm text-gray-600 mt-1">
            Please rank at least {minRank} option{minRank === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {filteredOptions.map((option) => (
          <div 
            key={option.id} 
            className="flex items-center p-4 border-2 border-gray-200 rounded-lg"
          >
            <div className="flex-shrink-0 w-20 mr-4">
              {uiMode === 'number_input' ? (
                <input
                  type="number"
                  min={1}
                  max={exactRank || maxRank || filteredOptions.length}
                  value={rankings[option.value] || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    handleRankChange(option.value, val);
                  }}
                  className="w-full px-2 py-1 border-2 border-gray-300 rounded text-center"
                  placeholder="#"
                />
              ) : (
                <select
                  value={rankings[option.value] || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                    handleRankChange(option.value, val);
                  }}
                  className="w-full px-2 py-1 border-2 border-gray-300 rounded"
                >
                  <option value="">-</option>
                  {Array.from(
                    { length: exactRank || maxRank || filteredOptions.length }, 
                    (_, i) => i + 1
                  ).map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              )}
            </div>
            <span className="option-text">{option.label}</span>
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600">
        Ranked: {getRankedCount()} / {exactRank || maxRank || filteredOptions.length}
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};
