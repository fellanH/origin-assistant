"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/session-utils";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/ai-elements/loader";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Square,
  BotIcon,
  ChevronDown,
  ChevronRight,
  User,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { ArtifactActions, ArtifactAction } from "@/components/ai-elements/artifact";
import type { SubagentState } from "@/lib/use-gateway";

export type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SubagentArtifactProps = {
  subagent: SubagentState;
  onViewHistory?: () => void;
  onStop?: () => void;
  onNavigateToSession?: (sessionKey: string) => void;
  className?: string;
  /** Optional conversation history for inline preview */
  conversationHistory?: HistoryMessage[];
};

const statusConfig = {
  spawning: {
    icon: null,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    badgeVariant: "default" as const,
    label: "Spawning...",
    isLoading: true,
  },
  running: {
    icon: null,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    badgeVariant: "default" as const,
    label: "Running",
    isLoading: true,
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/5",
    borderColor: "border-green-500/30",
    badgeVariant: "outline" as const,
    label: "Completed",
    isLoading: false,
  },
  error: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/30",
    badgeVariant: "outline" as const,
    label: "Error",
    isLoading: false,
  },
  timeout: {
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-500/5",
    borderColor: "border-orange-500/30",
    badgeVariant: "outline" as const,
    label: "Timed out",
    isLoading: false,
  },
};

export const SubagentArtifact = memo(function SubagentArtifact({
  subagent,
  onViewHistory,
  onStop,
  onNavigateToSession,
  className,
  conversationHistory,
}: SubagentArtifactProps) {
  const config = statusConfig[subagent.status];
  const Icon = config.icon;
  const isActive = config.isLoading;
  
  // Expanded by default when running, collapsed when completed
  const [expanded, setExpanded] = useState(isActive);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);

  // Copy result to clipboard
  const handleCopyResult = useCallback(async () => {
    if (!subagent.resultSummary) return;
    try {
      await navigator.clipboard.writeText(subagent.resultSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy result:", err);
    }
  }, [subagent.resultSummary]);

  // Live duration counter for active subagents
  useEffect(() => {
    if (!isActive) {
      // Set final duration
      setElapsed(
        subagent.completedAt
          ? subagent.completedAt - subagent.startedAt
          : Date.now() - subagent.startedAt
      );
      return;
    }

    // Initial value
    setElapsed(Date.now() - subagent.startedAt);

    // Update every second while running
    const interval = setInterval(() => {
      setElapsed(Date.now() - subagent.startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, subagent.startedAt, subagent.completedAt]);

  // Auto-collapse when status changes from active to completed
  useEffect(() => {
    if (!isActive) {
      setExpanded(false);
    }
  }, [isActive]);

  return (
    <div
      className={cn(
        "not-prose flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm transition-colors",
        config.borderColor,
        className
      )}
    >
      {/* Header - Agent style with Artifact container */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-b",
          config.bgColor
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Left side: Icon, Label, Model */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={cn("flex-shrink-0", config.color)}>
            <BotIcon className="size-4" />
          </div>
          <span className="font-medium text-sm truncate">
            {subagent.label || "Sub-agent"}
          </span>
          {subagent.model && (
            <Badge variant="secondary" className="font-mono text-xs flex-shrink-0">
              {subagent.model}
            </Badge>
          )}
        </div>

        {/* Right side: Status, Duration, Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status indicator */}
          {isActive ? (
            <Loader size={16} className={config.color} />
          ) : (
            Icon && <Icon className={cn("size-4", config.color)} />
          )}
          
          {/* Status badge */}
          <Badge
            variant={config.badgeVariant}
            className={cn(
              "text-xs",
              config.badgeVariant === "outline" && config.color
            )}
          >
            {isActive && subagent.currentTool 
              ? subagent.currentTool.name 
              : config.label}
          </Badge>
          
          {/* Duration and tool count */}
          <span className="text-xs text-muted-foreground font-mono text-right tabular-nums">
            {formatDuration(elapsed)}
            {subagent.toolCount ? ` • ${subagent.toolCount} tool${subagent.toolCount > 1 ? 's' : ''}` : ''}
          </span>
          
          {/* Expand/collapse chevron */}
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content (collapsible) */}
      {expanded && (
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {/* Task description */}
          <TaskDescription task={subagent.task} />

          {/* Result summary (only when completed) */}
          {subagent.status === "completed" && (
            <ResultSummary result={subagent.resultSummary} />
          )}

          {/* Conversation history preview - only for completed subagents */}
          {!isActive && conversationHistory && conversationHistory.length > 0 && (
            <HistoryPreview 
              messages={conversationHistory} 
              onViewHistory={onViewHistory}
            />
          )}

          {/* Error message */}
          {subagent.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {subagent.error}
            </div>
          )}

          {/* Session info (debug) */}
          {subagent.childSessionKey && (
            <div className="text-xs text-muted-foreground/60 font-mono truncate">
              {subagent.childSessionKey}
            </div>
          )}
        </div>
      )}

      {/* Actions row - always visible at bottom */}
      <div className="flex items-center justify-end gap-1 px-3 py-2 border-t bg-muted/30">
        <ArtifactActions>
          {/* Open Session - navigate to subagent session */}
          {subagent.childSessionKey && onNavigateToSession && (
            <ArtifactAction
              tooltip="Open subagent session"
              icon={ExternalLink}
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToSession(subagent.childSessionKey!);
              }}
              className="h-7 w-7"
            />
          )}

          {/* View History - always visible when session exists */}
          {subagent.childSessionKey && onViewHistory && (
            <ArtifactAction
              tooltip="View History"
              icon={Eye}
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              className="h-7 w-7"
            />
          )}

          {/* Stop - only while running */}
          {isActive && onStop && (
            <ArtifactAction
              tooltip="Stop"
              icon={Square}
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            />
          )}

          {/* Copy Result - only when completed with result */}
          {subagent.status === "completed" && subagent.resultSummary && (
            <ArtifactAction
              tooltip={copied ? "Copied!" : "Copy Result"}
              icon={copied ? Check : Copy}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyResult();
              }}
              className={cn("h-7 w-7", copied && "text-green-500")}
            />
          )}
        </ArtifactActions>
      </div>
    </div>
  );
});

SubagentArtifact.displayName = "SubagentArtifact";

/**
 * Collapsible task description component.
 * Long tasks (>100 chars) are truncated with "Show more" toggle.
 */
const TaskDescription = memo(function TaskDescription({
  task,
  maxLength = 100,
}: {
  task: string;
  maxLength?: number;
}) {
  const [showFull, setShowFull] = useState(false);
  const isLong = task.length > maxLength;
  const displayText = isLong && !showFull ? task.slice(0, maxLength) + "…" : task;

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
        {displayText}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowFull(!showFull);
          }}
          className="text-xs text-primary hover:underline mt-1"
        >
          {showFull ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
});

TaskDescription.displayName = "TaskDescription";

/**
 * Result summary component for completed subagents.
 * Shows what the subagent produced with success-tinted styling.
 * Long results (>200 chars) are truncated with "Show more" toggle.
 */
const ResultSummary = memo(function ResultSummary({
  result,
  maxLength = 200,
}: {
  result?: string;
  maxLength?: number;
}) {
  const [showFull, setShowFull] = useState(false);
  
  const hasResult = result && result.trim().length > 0;
  const displayText = hasResult
    ? (result.length > maxLength && !showFull ? result.slice(0, maxLength) + "…" : result)
    : "No result captured";
  const isLong = hasResult && result.length > maxLength;

  return (
    <div className="rounded-md bg-green-500/10 border border-green-500/20 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <CheckCircle className="size-3.5 text-green-600" />
        <span className="text-xs font-medium text-green-700 dark:text-green-400">Result</span>
      </div>
      <p className={cn(
        "text-sm whitespace-pre-wrap break-words",
        hasResult ? "text-foreground" : "text-muted-foreground italic"
      )}>
        {displayText}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowFull(!showFull);
          }}
          className="text-xs text-green-600 hover:underline mt-1"
        >
          {showFull ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
});

ResultSummary.displayName = "ResultSummary";

/**
 * Expandable history preview component.
 * Shows condensed conversation with max 5 messages inline.
 */
const HistoryPreview = memo(function HistoryPreview({
  messages,
  onViewHistory,
  maxInline = 5,
  maxContentLength = 80,
}: {
  messages: HistoryMessage[];
  onViewHistory?: () => void;
  maxInline?: number;
  maxContentLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const messageCount = messages.length;
  const displayMessages = messages.slice(0, maxInline);
  const hasMore = messageCount > maxInline;

  const truncateContent = (content: string): string => {
    if (content.length <= maxContentLength) return content;
    return content.slice(0, maxContentLength) + "…";
  };

  return (
    <div className="rounded-md border border-border/50 overflow-hidden">
      {/* Header - expandable */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <MessageSquare className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Conversation ({messageCount} message{messageCount !== 1 ? "s" : ""})
        </span>
        <div className="flex-1" />
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Message list - only when expanded */}
      {expanded && (
        <div className="px-3 py-2 space-y-1.5 bg-background">
          {displayMessages.map((msg, idx) => (
            <div key={idx} className="flex items-start gap-2">
              {/* Role icon */}
              <div className="flex-shrink-0 mt-0.5">
                {msg.role === "user" ? (
                  <User className="size-3 text-muted-foreground/70" />
                ) : (
                  <BotIcon className="size-3 text-muted-foreground/70" />
                )}
              </div>
              {/* Truncated content */}
              <p className="text-xs text-muted-foreground leading-relaxed break-words min-w-0">
                {truncateContent(msg.content)}
              </p>
            </div>
          ))}

          {/* View full history link */}
          {hasMore && onViewHistory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewHistory();
              }}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              <Eye className="size-3" />
              View full history ({messageCount - maxInline} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
});

HistoryPreview.displayName = "HistoryPreview";
