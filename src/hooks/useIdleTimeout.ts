
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A custom hook to detect user inactivity and trigger a callback.
 * @param onIdle - The function to call when the user is detected as idle.
 * @param timeout - The inactivity timeout in milliseconds. Defaults to 5 minutes.
 */
export function useIdleTimeout(onIdle: () => void, timeout: number = 5 * 60 * 1000) {
  const timeoutIdRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    timeoutIdRef.current = setTimeout(onIdle, timeout);
  }, [onIdle, timeout]);

  const handleEvent = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    // List of events to listen for to detect activity
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    // Set the initial timer
    resetTimer();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    // Cleanup function
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [handleEvent, resetTimer]);
}
