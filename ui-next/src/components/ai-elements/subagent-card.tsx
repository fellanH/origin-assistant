"use client";

import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import type { SubagentState } from "@/lib/use-gateway";

export type SubagentCardProps = {
  subagent: SubagentState;
  onViewHistory?: () => void;
  onStop?: () => void;
  className?: string;
};

const statusConfig = {
  spawning: {
    icon: null, // Uses Loader component
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    label: "Spawning...",
    isLoading: true,
  },
  running: {
    icon: null, // Uses Loader component
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    label: "Running",
    isLoading: true,
  },
  completed: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    label: "Completed",
    isLoading: false,
  },
  error: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    label: "Error",
    isLoading: false,
  },
  timeout: {
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    label: "Timed out",
    isLoading: false,
  },
};

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export const SubagentCard = memo(function SubagentCard({
  subagent,
  onViewHistory,
  onStop,
  className,
}: SubagentCardProps) {
  const config = statusConfig[subagent.status];
  const Icon = config.icon;
  const isActive = config.isLoading;
  const [expanded, setExpanded] = useState(isActive);
  const [elapsed, setElapsed] = useState(0);

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

    // Update every second while running
    const interval = setInterval(() => {
      setElapsed(Date.now() - subagent.startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, subagent.startedAt, subagent.completedAt]);

  return (
    <div
      className={cn(
        "not-prose w-full rounded-lg border transition-colors",
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 p-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {isActive ? (
            <Loader size={16} className={config.color} />
          ) : (
            Icon && <Icon className={cn("size-4", config.color)} />
          )}
          <Badge
            variant={isActive ? "default" : "outline"}
            className={cn("text-xs", !isActive && config.color)}
          >
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono w-16 text-right">
            {formatDuration(elapsed)}
          </span>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Content (collapsible) */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Task description */}
          <div className="rounded-md bg-background/50 p-2.5 text-sm text-muted-foreground">
            <p className="whitespace-pre-wrap break-words">{subagent.task}</p>
          </div>

          {/* Error message */}
          {subagent.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-sm text-destructive">
              {subagent.error}
            </div>
          )}

          {/* Session info */}
          {subagent.childSessionKey && (
            <div className="text-xs text-muted-foreground font-mono truncate">
              {subagent.childSessionKey}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {subagent.childSessionKey && onViewHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewHistory();
                }}
                className="h-7 text-xs"
              >
                <Eye className="size-3 mr-1" />
                History
              </Button>
            )}
            {isActive && onStop && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop();
                }}
                className="h-7 text-xs text-destructive hover:text-destructive"
              >
                <Square className="size-3 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

SubagentCard.displayName = "SubagentCard";
