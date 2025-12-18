import { useState, useEffect, useRef } from 'react';

interface UseSurveyTimerProps {
  timeLimitSeconds: number;
  onTimeUp: () => void;
  isActive?: boolean;
}

interface TimerState {
  remainingSeconds: number;
  isExpired: boolean;
  formattedTime: string;
  percentageRemaining: number;
}

/**
 * Hook to manage survey timer with auto-submit functionality
 */
export function useSurveyTimer({
  timeLimitSeconds,
  onTimeUp,
  isActive = true
}: UseSurveyTimerProps): TimerState {
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitSeconds);
  const [isExpired, setIsExpired] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);

  // Keep the callback ref updated
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (!isActive || isExpired) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(interval);
          // Call the onTimeUp callback
          setTimeout(() => onTimeUpRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isExpired]);

  // Format time as MM:SS or HH:MM:SS
  const formattedTime = formatTime(remainingSeconds);

  // Calculate percentage remaining
  const percentageRemaining = (remainingSeconds / timeLimitSeconds) * 100;

  return {
    remainingSeconds,
    isExpired,
    formattedTime,
    percentageRemaining
  };
}

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
