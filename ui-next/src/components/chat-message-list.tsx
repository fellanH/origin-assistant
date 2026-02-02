"use client";

import { useRef, useEffect, memo, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useChatContext } from "./chat-provider";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "./ai-elements/message";
import { MessageParts } from "./ai-elements/message-parts";
import {
  MessageSkeleton,
  ConversationSkeleton,
} from "./ai-elements/message-skeleton";
import { Loader } from "./ai-elements/loader";
import { CompactErrorBoundary } from "./error-boundary";
import { EmptyState } from "./empty-state";
import type { SubagentState } from "@/lib/session-store";
import { CheckIcon, CopyIcon, RefreshCcwIcon } from "lucide-react";

interface ChatMessageListProps {
  onCopy?: (content: string, messageId: string) => void;
  onRegenerate?: () => void;
  copiedId?: string | null;
  onSuggestionClick?: (suggestion: string) => void;
  onSubagentViewHistory?: (subagent: SubagentState) => void;
  onSubagentStop?: (subagent: SubagentState) => void;
  onSubagentNavigateToSession?: (sessionKey: string) => void;
}

/**
 * ChatMessageList - Renders messages with smart animation.
 *
 * Animation strategy:
 * - History messages (loaded on session switch/init) appear instantly
 * - Only new messages (sent after initial load) animate in
 * - This prevents jumpiness when loading history while keeping
 *   smooth animations for new messages
 */
export const ChatMessageList = memo(function ChatMessageList({
  onCopy,
  onRegenerate,
  copiedId,
  onSuggestionClick,
  onSubagentViewHistory,
  onSubagentStop,
  onSubagentNavigateToSession,
}: ChatMessageListProps) {
  const {
    sessionKey,
    messages,
    status,
    streamingContent,
    historyLoading,
    historyLoaded,
    toolExecutions,
    subagents,
    messageQueue,
  } = useChatContext();

  // Track initial load completion per session
  const initialLoadComplete = useRef(false);
  const previousMessageCount = useRef(0);
  const currentSessionKey = useRef(sessionKey);

  // Reset animation tracking when session changes
  useEffect(() => {
    if (currentSessionKey.current !== sessionKey) {
      initialLoadComplete.current = false;
      previousMessageCount.current = 0;
      currentSessionKey.current = sessionKey;
    }
  }, [sessionKey]);

  // Mark initial load as complete after history loads
  useEffect(() => {
    if (historyLoaded && !initialLoadComplete.current) {
      // Use requestAnimationFrame to mark complete after render
      requestAnimationFrame(() => {
        initialLoadComplete.current = true;
        previousMessageCount.current = messages.length;
      });
    }
  }, [historyLoaded, messages.length]);

  // Update previous count when messages change (after initial load)
  useEffect(() => {
    if (initialLoadComplete.current) {
      // Defer update to next frame to let animation start first
      requestAnimationFrame(() => {
        previousMessageCount.current = messages.length;
      });
    }
  }, [messages.length]);

  // Determine animation props for a message based on its position
  const getMessageAnimation = useCallback((index: number) => {
    // Don't animate during initial load
    if (!initialLoadComplete.current) {
      return { initial: false };
    }

    // Only animate messages added after initial load
    if (index >= previousMessageCount.current) {
      return {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0 },
        transition: { duration: 0.2 },
      };
    }

    // History messages: no animation
    return { initial: false };
  }, []);

  // Subagent action wrappers
  const handleSubagentViewHistory = useCallback(
    (subagent: { childSessionKey?: string }) => {
      if (subagent.childSessionKey && onSubagentViewHistory) {
        onSubagentViewHistory(subagent as SubagentState);
      }
    },
    [onSubagentViewHistory]
  );

  const handleSubagentStop = useCallback(
    (subagent: { childSessionKey?: string }) => {
      if (subagent.childSessionKey && onSubagentStop) {
        onSubagentStop(subagent as SubagentState);
      }
    },
    [onSubagentStop]
  );

  // Loading skeleton while fetching history
  if (historyLoading && messages.length === 0) {
    return <ConversationSkeleton messageCount={2} />;
  }

  // Empty state - only show if not loading and no messages
  if (
    !historyLoading &&
    messages.length === 0 &&
    !streamingContent &&
    status !== "submitted"
  ) {
    // Only render EmptyState if onSuggestionClick is provided
    if (onSuggestionClick) {
      return (
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          <EmptyState onSuggestionClick={onSuggestionClick} />
        </motion.div>
      );
    }
    // Fallback empty state without suggestions
    return (
      <motion.div
        key="empty"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center h-full"
      >
        <p className="text-muted-foreground">Start a conversation...</p>
      </motion.div>
    );
  }

  return (
    <>
      {/* Message list with smart animation */}
      <AnimatePresence initial={false}>
        {messages.map((message, index) => {
          const isLatestAssistant =
            message.role === "assistant" && index === messages.length - 1;
          const animation = getMessageAnimation(index);

          return (
            <motion.div key={message.id} {...animation}>
              <CompactErrorBoundary label="Message">
                <Message from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageParts
                        content={message.content}
                        parts={message.parts}
                        isStreaming={isLatestAssistant && status === "streaming"}
                        toolExecutions={
                          isLatestAssistant ? toolExecutions : undefined
                        }
                        subagents={isLatestAssistant ? subagents : undefined}
                        onSubagentViewHistory={handleSubagentViewHistory}
                        onSubagentStop={handleSubagentStop}
                        onSubagentNavigateToSession={onSubagentNavigateToSession}
                      />
                    ) : (
                      <MessageResponse>{message.content}</MessageResponse>
                    )}
                  </MessageContent>
                  {isLatestAssistant && status === "idle" && (
                    <MessageActions>
                      <MessageAction onClick={onRegenerate} label="Regenerate">
                        <RefreshCcwIcon className="size-3" />
                      </MessageAction>
                      <MessageAction
                        onClick={() => onCopy?.(message.content, message.id)}
                        label={copiedId === message.id ? "Copied!" : "Copy"}
                      >
                        {copiedId === message.id ? (
                          <CheckIcon className="size-3 text-emerald-500" />
                        ) : (
                          <CopyIcon className="size-3" />
                        )}
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              </CompactErrorBoundary>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Streaming message / Active subagents */}
      <AnimatePresence>
        {(((streamingContent || toolExecutions.size > 0) &&
          status === "streaming") ||
          (subagents.size > 0 &&
            Array.from(subagents.values()).some(
              (s) => s.status === "spawning" || s.status === "running"
            ))) && (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CompactErrorBoundary label="Streaming message">
              <Message from="assistant">
                <MessageContent>
                  <MessageParts
                    content={streamingContent}
                    isStreaming={true}
                    toolExecutions={toolExecutions}
                    subagents={subagents}
                    onSubagentViewHistory={handleSubagentViewHistory}
                    onSubagentStop={handleSubagentStop}
                    onSubagentNavigateToSession={onSubagentNavigateToSession}
                  />
                </MessageContent>
              </Message>
            </CompactErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking indicator */}
      <AnimatePresence>
        {(status === "submitted" ||
          (status === "streaming" &&
            !streamingContent &&
            toolExecutions.size === 0)) && (
          <Loader key="thinking" variant="thinking" label="Thinking" />
        )}
      </AnimatePresence>

      {/* Queued messages */}
      <AnimatePresence>
        {messageQueue.map((text, i) => (
          <motion.div
            key={`queued-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Message from="user">
              <MessageContent>
                <div className="opacity-50 italic">
                  <MessageResponse>{text}</MessageResponse>
                  <span className="text-xs text-muted-foreground ml-2">
                    Queued
                  </span>
                </div>
              </MessageContent>
            </Message>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
});
