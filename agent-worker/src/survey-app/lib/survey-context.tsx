'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SurveyResponse } from '../types/survey';

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
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('S1');
  const [visitedQuestions, setVisitedQuestions] = useState<string[]>([]);
  const [startedAt] = useState<Date>(new Date());
  const [progress, setProgress] = useState<number>(0);
  const [surveyStartTime, setSurveyStartTime] = useState<Date | null>(null);

  // Load from localStorage on mount
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
      } catch (e) {
        console.error('Failed to load saved survey data', e);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const data = {
      responses,
      currentQuestionId,
      visitedQuestions,
      progress,
      surveyStartTime: surveyStartTime?.toISOString(),
      lastSavedAt: new Date().toISOString()
    };
    localStorage.setItem('survey-response', JSON.stringify(data));
  }, [responses, currentQuestionId, visitedQuestions, progress, surveyStartTime]);

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

  const clearResponses = () => {
    setResponses({});
    setCurrentQuestionId('S1');
    setVisitedQuestions([]);
    setProgress(0);
    setSurveyStartTime(null);
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
        setSurveyStartTime
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
