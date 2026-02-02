"use client";

import { useEffect, useRef } from "react";
import { useStickToBottomContext } from "use-stick-to-bottom";
import { useSessionStore, useSessionField } from "@/lib/session-store";

interface SessionScrollHandlerProps {
  sessionKey: string;
}

/**
 * Handles scroll state preservation when switching sessions.
 * Must be rendered inside a StickToBottom component.
 */
export function SessionScrollHandler({ sessionKey }: SessionScrollHandlerProps) {
  const { isAtBottom, scrollToBottom, scrollRef } = useStickToBottomContext();
  const setScrollState = useSessionStore((s) => s.setScrollState);
  
  // Get the session's saved scroll state
  const savedIsAtBottom = useSessionField(sessionKey, (s) => s.isAtBottom);
  const savedScrollOffset = useSessionField(sessionKey, (s) => s.scrollOffset);
  const historyLoaded = useSessionField(sessionKey, (s) => s.historyLoaded);
  
  // Track previous session to detect switches
  const prevSessionKeyRef = useRef(sessionKey);
  const hasRestoredRef = useRef(false);
  
  // Save scroll state when it changes (for current session)
  useEffect(() => {
    // Don't save during initial load
    if (!historyLoaded) return;
    
    const scrollEl = scrollRef.current;
    const offset = scrollEl?.scrollTop ?? null;
    
    setScrollState(sessionKey, isAtBottom, offset);
  }, [isAtBottom, sessionKey, setScrollState, historyLoaded, scrollRef]);
  
  // Restore scroll state when switching to this session
  useEffect(() => {
    // Detect session change
    if (prevSessionKeyRef.current !== sessionKey) {
      prevSessionKeyRef.current = sessionKey;
      hasRestoredRef.current = false;
    }
    
    // Wait for history to load before restoring
    if (!historyLoaded || hasRestoredRef.current) return;
    
    hasRestoredRef.current = true;
    
    // If session was at bottom, instant scroll to bottom
    if (savedIsAtBottom) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        scrollToBottom("instant");
      });
    } else if (savedScrollOffset !== null) {
      // Restore saved scroll position
      const scrollEl = scrollRef.current;
      if (scrollEl) {
        requestAnimationFrame(() => {
          scrollEl.scrollTop = savedScrollOffset;
        });
      }
    }
  }, [sessionKey, historyLoaded, savedIsAtBottom, savedScrollOffset, scrollToBottom, scrollRef]);
  
  return null; // This is a behavior-only component
}
