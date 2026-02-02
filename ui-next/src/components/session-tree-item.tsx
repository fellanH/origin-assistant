"use client";

import { ChevronDownIcon, ChevronRightIcon, Trash2Icon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSessionIcon,
  getSessionDisplayName,
  formatDuration,
  type SessionTreeNode,
} from "@/lib/session-utils";

// ============================================================================
// Time Formatting
// ============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// Status Badge Component
// ============================================================================

type StatusBadgeProps = {
  status: string;
  duration?: number;
};

function StatusBadge({ status, duration }: StatusBadgeProps) {
  const statusColors: Record<string, string> = {
    spawning: "text-blue-500",
    running: "text-yellow-500",
    completed: "text-green-500",
    error: "text-red-500",
    timeout: "text-orange-500",
  };
  
  const statusIcons: Record<string, string> = {
    spawning: "⏳",
    running: "🔄",
    completed: "✓",
    error: "✗",
    timeout: "⏱",
  };
  
  return (
    <span className={cn("text-xs whitespace-nowrap", statusColors[status] || "text-muted-foreground")}>
      {statusIcons[status] || ""} {duration !== undefined && formatDuration(duration)}
    </span>
  );
}

// ============================================================================
// Session Tree Item Component
// ============================================================================

export type SessionTreeItemProps = {
  node: SessionTreeNode;
  currentSessionKey: string;
  onSessionSelect: (key: string) => void;
  onDelete: (key: string) => void;
  onToggleExpand: (key: string) => void;
  expandedKeys: Set<string>;
};

export function SessionTreeItem({
  node,
  currentSessionKey,
  onSessionSelect,
  onDelete,
  onToggleExpand,
  expandedKeys,
}: SessionTreeItemProps) {
  const { session, parsed, children, depth, subagentMeta } = node;
  
  const icon = getSessionIcon(parsed);
  const displayName = subagentMeta?.label || getSessionDisplayName(session, parsed);
  const isActive = session.key === currentSessionKey;
  const isExpanded = expandedKeys.has(session.key);
  const hasChildren = children.length > 0;
  
  const timeAgo = session.lastTurnAt
    ? formatTimeAgo(session.lastTurnAt)
    : session.createdAt
    ? formatTimeAgo(session.createdAt)
    : null;
  
  // Calculate left padding based on depth
  const paddingLeft = depth === 0 ? 12 : 12 + depth * 20;
  
  return (
    <div>
      {/* Main item row */}
      <div
        className={cn(
          "group w-full flex items-center gap-2 py-2 rounded-xl text-left transition-all cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground"
            : "hover:bg-accent/50 text-foreground"
        )}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "12px" }}
        onClick={() => onSessionSelect(session.key)}
        title={session.key}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(session.key);
            }}
            className={cn(
              "p-0.5 rounded hover:bg-accent/50 flex-shrink-0",
              isActive && "hover:bg-primary-foreground/20"
            )}
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronRightIcon className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" /> // Spacer for alignment
        )}
        
        {/* Icon */}
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm",
          isActive ? "bg-primary-foreground/20" : "bg-accent/50"
        )}>
          {parsed.type === "subagent" ? icon : <SparklesIcon className="w-3.5 h-3.5" />}
        </div>
        
        {/* Name and meta info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {parsed.type !== "subagent" && <span>{icon}</span>}
            <span className="truncate">{displayName}</span>
            {/* Child count when collapsed */}
            {hasChildren && !isExpanded && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full",
                isActive ? "bg-primary-foreground/20" : "bg-accent"
              )}>
                {children.length}
              </span>
            )}
          </div>
          
          {/* Secondary info line */}
          <div className={cn(
            "text-xs truncate flex items-center gap-1",
            isActive ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {/* Subagent status */}
            {subagentMeta?.status && (
              <StatusBadge status={subagentMeta.status} duration={subagentMeta.duration} />
            )}
            
            {/* Time ago */}
            {timeAgo && !subagentMeta?.status && <span>{timeAgo}</span>}
            
            {/* Message count */}
            {session.messageCount !== undefined && session.messageCount > 0 && !subagentMeta?.status && (
              <span>{timeAgo ? " · " : ""}{session.messageCount} messages</span>
            )}
          </div>
        </div>
        
        {/* Reasoning indicator */}
        {session.reasoningLevel && session.reasoningLevel !== "off" && (
          <span className="text-xs flex-shrink-0" title={`Reasoning: ${session.reasoningLevel}`}>
            🧠
          </span>
        )}
        
        {/* Delete button - only for local sessions */}
        {session.isLocal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.key);
            }}
            className={cn(
              "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0",
              isActive
                ? "hover:bg-primary-foreground/20 text-primary-foreground"
                : "hover:bg-destructive/10 text-destructive"
            )}
            title="Delete session"
          >
            <Trash2Icon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Children (recursive) */}
      {isExpanded && hasChildren && (
        <div>
          {children.map((child) => (
            <SessionTreeItem
              key={child.session.key}
              node={child}
              currentSessionKey={currentSessionKey}
              onSessionSelect={onSessionSelect}
              onDelete={onDelete}
              onToggleExpand={onToggleExpand}
              expandedKeys={expandedKeys}
            />
          ))}
        </div>
      )}
    </div>
  );
}
