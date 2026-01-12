'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SurveyResponse, HiddenVariable, DerivedRule } from '../types/survey';

interface LoopState {
  sourceQuestionId: string;
  currentIndex: number;
  items: string[];
}

interface SurveyContextType {
  responses: Record<string, any>;
  setResponse: (questionId: string, value: any) => void;
  currentQuestionId: string;
  setCurrentQuestionId: (id: string) => void;
  visitedQuestions: string[];
  addVisitedQuestion: (id: string) => void;
  startedAt: Date;
  progress: number;
  setProgress: (progress: number) => void;
  clearResponses: () => void;
  surveyStartTime: Date | null;
  setSurveyStartTime: (time: Date) => void;
  respondentMetadata: Record<string, string>;
  setRespondentMetadata: (key: string, value: string) => void;
  loopState: LoopState | null;
  setLoopState: (state: LoopState | null) => void;
  getCurrentLoopItem: () => string | null;
  hiddenVariables: Record<string, string | number>;
  computeHiddenVariables: (triggerQuestionId: string, variables: HiddenVariable[]) => void;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

function evaluateDerivedCondition(condition: string, responses: Record<string, any>): boolean {
  const inMatch = condition.match(/^(\w+)\s+in\s+\[([^\]]+)\]$/);
  if (inMatch) {
    const questionId = inMatch[1];
    const valuesStr = inMatch[2];
    const values = valuesStr.split(',').map(v => v.trim().replace(/['"]/g, ''));
    const response = responses[questionId];
    return values.includes(response);
  }
  
  const eqMatch = condition.match(/^(\w+)\s*=\s*['"]?([^'"]+)['"]?$/);
  if (eqMatch) {
    const questionId = eqMatch[1];
    const value = eqMatch[2];
    return responses[questionId] === value;
  }
  
  return false;
}

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('S1');
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([]);
  const [startedAt] = useState<Date>(new Date());
  const [progress, setProgress] = useState<number>(0);
  const [surveyStartTime, setSurveyStartTime] = useState<Date | null>(null);
  const [respondentMetadata, setRespondentMetadataState] = useState<Record<string, string>>({});
  const [loopState, setLoopState] = useState<LoopState | null>(null);
  const [hiddenVariables, setHiddenVariables] = useState<Record<string, string | number>>({});

  useEffect(() => {
    const saved = localStorage.getItem('survey-response');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setResponses(data.responses || {});
        setCurrentQuestionId(data.currentQuestionId || 'S1');
        setVisitedQuestions(data.visitedQuestions || []);
        setProgress(data.progress || 0);
        if (data.surveyStartTime) {
          setSurveyStartTime(new Date(data.surveyStartTime));
        }
        if (data.respondentMetadata) {
          setRespondentMetadataState(data.respondentMetadata);
        }
        if (data.loopState) {
          setLoopState(data.loopState);
        }
        if (data.hiddenVariables) {
          setHiddenVariables(data.hiddenVariables);
        }
      } catch (e) {
        console.error('Failed to load saved survey data', e);
      }
    }
  }, []);

  useEffect(() => {
    const data = {
      responses,
      currentQuestionId,
      visitedQuestions,
      progress,
      surveyStartTime: surveyStartTime?.toISOString(),
      respondentMetadata,
      loopState,
      hiddenVariables,
      lastSavedAt: new Date().toISOString()
    };
    localStorage.setItem('survey-response', JSON.stringify(data));
  }, [responses, currentQuestionId, visitedQuestions, progress, surveyStartTime, respondentMetadata, loopState, hiddenVariables]);

  const setResponse = (questionId: string, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const addVisitedQuestion = (id: string) => {
    setVisitedQuestions(prev => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
  };

  const setRespondentMetadata = (key: string, value: string) => {
    setRespondentMetadataState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getCurrentLoopItem = (): string | null => {
    if (!loopState || loopState.currentIndex >= loopState.items.length) {
      return null;
    }
    return loopState.items[loopState.currentIndex];
  };

  const computeHiddenVariables = useCallback((triggerQuestionId: string, variables: HiddenVariable[]) => {
    const triggeredVars = variables.filter(v => v.computeOn === triggerQuestionId);
    if (triggeredVars.length === 0) return;

    const newValues: Record<string, string | number> = {};
    
    for (const variable of triggeredVars) {
      if (variable.type === 'derived' && variable.rules) {
        for (const rule of variable.rules) {
          if (evaluateDerivedCondition(rule.condition, responses)) {
            newValues[variable.id] = rule.value;
            break;
          }
        }
      }
    }

    if (Object.keys(newValues).length > 0) {
      setHiddenVariables(prev => ({ ...prev, ...newValues }));
    }
  }, [responses]);

  const clearResponses = () => {
    setResponses({});
    setCurrentQuestionId('S1');
    setVisitedQuestions([]);
    setProgress(0);
    setSurveyStartTime(null);
    setRespondentMetadataState({});
    setLoopState(null);
    setHiddenVariables({});
    localStorage.removeItem('survey-response');
  };

  return (
    <SurveyContext.Provider
      value={{
        responses,
        setResponse,
        currentQuestionId,
        setCurrentQuestionId,
        visitedQuestions,
        addVisitedQuestion,
        startedAt,
        progress,
        setProgress,
        clearResponses,
        surveyStartTime,
        setSurveyStartTime,
        respondentMetadata,
        setRespondentMetadata,
        loopState,
        setLoopState,
        getCurrentLoopItem,
        hiddenVariables,
        computeHiddenVariables
      }}
    >
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurvey() {
  const context = useContext(SurveyContext);
  if (context === undefined) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
}
