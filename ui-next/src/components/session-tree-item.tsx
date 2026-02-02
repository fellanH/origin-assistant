"use client";

import { ChevronDownIcon, ChevronRightIcon, Trash2Icon, EraserIcon } from "lucide-react";
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
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "last week";
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "last month";
  return `${months}mo ago`;
}

// ============================================================================
// Status Badge Component
// ============================================================================

type StatusBadgeProps = {
  status: string;
  duration?: number;
};

function StatusBadge({ status, duration }: StatusBadgeProps) {
  const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
    spawning: { color: "text-blue-400", icon: "◐", label: "Starting" },
    running: { color: "text-amber-400", icon: "●", label: "Running" },
    completed: { color: "text-emerald-500", icon: "✓", label: "Done" },
    error: { color: "text-red-400", icon: "✗", label: "Error" },
    timeout: { color: "text-orange-400", icon: "⏱", label: "Timeout" },
  };
  
  const config = statusConfig[status] || { color: "text-muted-foreground", icon: "○", label: status };
  
  return (
    <span className={cn("text-[11px] whitespace-nowrap flex items-center gap-1", config.color)}>
      <span className={status === "running" ? "animate-pulse" : ""}>{config.icon}</span>
      <span>{duration !== undefined ? formatDuration(duration) : config.label}</span>
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
  onClear: (key: string) => void;
  onToggleExpand: (key: string) => void;
  expandedKeys: Set<string>;
};

export function SessionTreeItem({
  node,
  currentSessionKey,
  onSessionSelect,
  onDelete,
  onClear,
  onToggleExpand,
  expandedKeys,
}: SessionTreeItemProps) {
  const { session, parsed, children, depth, subagentMeta } = node;
  
  const icon = getSessionIcon(parsed);
  const displayName = getSessionDisplayName(session, parsed, subagentMeta);
  const isActive = session.key === currentSessionKey;
  const isExpanded = expandedKeys.has(session.key);
  const hasChildren = children.length > 0;
  const isSubagent = parsed.type === "subagent";
  const isCron = parsed.type === "cron";
  
  const timeAgo = session.lastTurnAt
    ? formatTimeAgo(session.lastTurnAt)
    : session.createdAt
    ? formatTimeAgo(session.createdAt)
    : null;
  
  // Calculate left padding based on depth (tighter spacing for nested items)
  const paddingLeft = depth === 0 ? 10 : 10 + depth * 16;
  
  return (
    <div>
      {/* Main item row */}
      <div
        className={cn(
          "group w-full flex items-center gap-2.5 py-2.5 rounded-xl text-left transition-all cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20"
            : "hover:bg-accent/60 text-foreground",
          // Subtle styling for subagents and cron
          !isActive && (isSubagent || isCron) && "opacity-80 hover:opacity-100"
        )}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "10px" }}
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
              "p-0.5 rounded hover:bg-accent/50 flex-shrink-0 transition-colors",
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
        
        {/* Icon - slightly smaller for subagents */}
        <div className={cn(
          "rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
          isSubagent ? "w-6 h-6 text-xs" : "w-7 h-7 text-sm",
          isActive 
            ? "bg-primary-foreground/20" 
            : isSubagent 
              ? "bg-accent/30" 
              : "bg-accent/50"
        )}>
          {icon}
        </div>
        
        {/* Name and meta info */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "truncate flex items-center gap-2",
            isActive ? "font-medium" : "font-normal",
            isSubagent ? "text-[13px]" : "text-sm"
          )}>
            <span className="truncate">{displayName}</span>
            {/* Child count when collapsed */}
            {hasChildren && !isExpanded && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                isActive ? "bg-primary-foreground/20" : "bg-accent"
              )}>
                {children.length}
              </span>
            )}
          </div>
          
          {/* Secondary info line */}
          <div className={cn(
            "text-[11px] truncate flex items-center gap-1 mt-0.5",
            isActive ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {/* Subagent status */}
            {subagentMeta?.status && (
              <StatusBadge status={subagentMeta.status} duration={subagentMeta.duration} />
            )}
            
            {/* Time ago */}
            {timeAgo && !subagentMeta?.status && <span>{timeAgo}</span>}
            
            {/* Message count - only show if significant */}
            {session.messageCount !== undefined && session.messageCount > 1 && !subagentMeta?.status && (
              <span className="opacity-70">{timeAgo ? " · " : ""}{session.messageCount} msgs</span>
            )}
          </div>
        </div>
        
        {/* Reasoning indicator */}
        {session.reasoningLevel && session.reasoningLevel !== "off" && (
          <span className="text-xs flex-shrink-0 opacity-70" title={`Reasoning: ${session.reasoningLevel}`}>
            🧠
          </span>
        )}
        
        {/* Clear button - only for local sessions with messages */}
        {session.isLocal && session.messageCount !== undefined && session.messageCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear(session.key);
            }}
            className={cn(
              "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0",
              isActive
                ? "hover:bg-primary-foreground/20 text-primary-foreground"
                : "hover:bg-accent text-muted-foreground hover:text-foreground"
            )}
            title="Clear messages"
          >
            <EraserIcon className="w-3.5 h-3.5" />
          </button>
        )}
        
        {/* Delete button - only for local sessions */}
        {session.isLocal && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.key);
            }}
            className={cn(
              "p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0",
              isActive
                ? "hover:bg-primary-foreground/20 text-primary-foreground"
                : "hover:bg-destructive/10 text-destructive/80 hover:text-destructive"
            )}
            title="Delete session"
          >
            <Trash2Icon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      
      {/* Children (recursive) with subtle left border */}
      {isExpanded && hasChildren && (
        <div className="relative ml-5 pl-2 border-l border-border/30">
          {children.map((child) => (
            <SessionTreeItem
              key={child.session.key}
              node={child}
              currentSessionKey={currentSessionKey}
              onSessionSelect={onSessionSelect}
              onDelete={onDelete}
              onClear={onClear}
              onToggleExpand={onToggleExpand}
              expandedKeys={expandedKeys}
            />
          ))}
        </div>
      )}
    </div>
  );
}
