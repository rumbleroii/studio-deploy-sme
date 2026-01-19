'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Question, Option } from '../types/survey';
import { useSurvey } from '../lib/survey-context';
import { applyPiping } from '../lib/logic-evaluator';
import { filterOptions } from '../lib/masking';
import { applyOptionOrdering } from '../lib/ordering';
import { LoopState, getEffectiveQuestionId } from '../lib/loop-utils';

interface RankingRendererProps {
  question: Question;
  allQuestions?: Question[];
  isFirstVisit?: boolean;
  loopState?: LoopState | null;
  currentLoopItem?: string | null;
}

type RankingValue = Record<string | number, number | null>;

export const RankingRenderer: React.FC<RankingRendererProps> = ({
  question,
  allQuestions,
  isFirstVisit,
  loopState,
  currentLoopItem
}) => {
  const { responses, setResponse, respondentMetadata } = useSurvey();
  const [rankings, setRankings] = useState<RankingValue>({});
  const [error, setError] = useState<string>('');
  const [pendingInputs, setPendingInputs] = useState<Record<string, string>>({});

  // Compute effective question ID for loop questions
  const effectiveQuestionId = getEffectiveQuestionId(question.id, loopState ?? null, currentLoopItem ?? null);

  // Build loop context for piping
  const loopContext = loopState && currentLoopItem ? {
    currentItem: currentLoopItem,
    sourceQuestionId: loopState.sourceQuestionId
  } : undefined;

  const questionText = applyPiping(question.text, responses, allQuestions, loopContext, respondentMetadata);
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
    const storedValue = responses[effectiveQuestionId];
    if (storedValue && typeof storedValue === 'object' && !isFirstVisit) {
      setRankings(storedValue);
    } else {
      // Reset state for new loop iterations or first visits
      setRankings({});
      setPendingInputs({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveQuestionId, isFirstVisit]);

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
    setResponse(effectiveQuestionId, newRankings);
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
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pendingInputs[String(option.value)] ?? (rankings[option.value] || '')}
                  onChange={(e) => {
                    // Allow typing without immediate validation (deferred validation pattern)
                    setPendingInputs(prev => ({ ...prev, [String(option.value)]: e.target.value }));
                    setError('');
                  }}
                  onBlur={() => {
                    // Validate and commit on blur
                    const inputValue = pendingInputs[String(option.value)];
                    const rank = inputValue === '' || inputValue === undefined ? null : parseInt(inputValue, 10);
                    setPendingInputs(prev => {
                      const next = { ...prev };
                      delete next[String(option.value)];
                      return next;
                    });
                    handleRankChange(option.value, rank);
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
