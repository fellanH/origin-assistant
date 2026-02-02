"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BotIcon,
  CpuIcon,
  FolderIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  WrenchIcon,
  BrainIcon,
  CircleDotIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface ExternalAgent {
  pid: number;
  cwd: string;
  project: string;
  cpuPercent: number;
  memoryMb: number;
  sessionId?: string;
  task?: string;
  statusText?: string;
  activity: "idle" | "thinking" | "tool-use" | "unknown";
  currentTool?: string;
  startedAt?: string;
  lastActivityAt?: string;
  messageCount?: number;
  model?: string;
}

// =============================================================================
// Hook
// =============================================================================

function useExternalAgents(pollInterval = 5000) {
  const [agents, setAgents] = useState<ExternalAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/external-agents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAgents(data.agents ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAgents, pollInterval]);

  return { agents, loading, error, refresh: fetchAgents };
}

// =============================================================================
// Activity Indicator
// =============================================================================

function ActivityIndicator({ activity, tool }: { activity: string; tool?: string }) {
  switch (activity) {
    case "thinking":
      return (
        <div className="flex items-center gap-1.5 text-amber-500">
          <BrainIcon className="w-3 h-3 animate-pulse" />
          <span className="text-xs">Thinking...</span>
        </div>
      );
    case "tool-use":
      return (
        <div className="flex items-center gap-1.5 text-blue-500">
          <WrenchIcon className="w-3 h-3 animate-spin" />
          <span className="text-xs truncate max-w-[100px]">{tool || "Tool"}</span>
        </div>
      );
    case "idle":
      return (
        <div className="flex items-center gap-1.5 text-green-500">
          <CircleDotIcon className="w-3 h-3" />
          <span className="text-xs">Idle</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CircleDotIcon className="w-3 h-3" />
          <span className="text-xs">Unknown</span>
        </div>
      );
  }
}

// =============================================================================
// Agent Card
// =============================================================================

function ExternalAgentCard({ agent }: { agent: ExternalAgent }) {
  const [expanded, setExpanded] = useState(false);

  const isActive = agent.cpuPercent > 5;

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isActive
          ? "bg-accent/30 border-accent/50"
          : "bg-card/50 border-border/50 hover:bg-accent/20"
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2 text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? (
            <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
              isActive ? "bg-green-500/20" : "bg-muted/50"
            )}
          >
            <BotIcon
              className={cn(
                "w-3.5 h-3.5",
                isActive ? "text-green-500" : "text-muted-foreground"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{agent.project}</span>
              {isActive && (
                <span className="text-[10px] text-green-500 font-medium">
                  {agent.cpuPercent.toFixed(0)}%
                </span>
              )}
            </div>
            <ActivityIndicator activity={agent.activity} tool={agent.currentTool} />
          </div>
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-2 text-xs">
              {/* Task */}
              {agent.task && (
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Task:</span>
                  <p className="text-foreground/80 line-clamp-2">{agent.task}</p>
                </div>
              )}

              {/* Status */}
              {agent.statusText && (
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Status:</span>
                  <p className="text-foreground/80 line-clamp-2">{agent.statusText}</p>
                </div>
              )}

              {/* Meta row */}
              <div className="flex items-center gap-3 text-muted-foreground pt-1">
                <div className="flex items-center gap-1">
                  <FolderIcon className="w-3 h-3" />
                  <span className="truncate max-w-[120px]" title={agent.cwd}>
                    {agent.cwd.split("/").slice(-2).join("/")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CpuIcon className="w-3 h-3" />
                  <span>{agent.memoryMb}MB</span>
                </div>
              </div>

              {/* Model */}
              {agent.model && (
                <div className="text-muted-foreground">
                  Model: <span className="text-foreground/70">{agent.model.split("-").slice(0, 2).join("-")}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface ExternalAgentsListProps {
  className?: string;
}

export function ExternalAgentsList({ className }: ExternalAgentsListProps) {
  const { agents, loading, error, refresh } = useExternalAgents();
  const [collapsed, setCollapsed] = useState(false);

  // Don't render if no agents
  if (!loading && agents.length === 0) {
    return null;
  }

  const activeCount = agents.filter((a) => a.cpuPercent > 5).length;

  return (
    <div className={cn("", className)}>
      {/* Section header */}
      <div className="flex items-center justify-between px-4 py-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-3.5 h-3.5" />
          ) : (
            <ChevronDownIcon className="w-3.5 h-3.5" />
          )}
          External Agents
          {agents.length > 0 && (
            <span className="ml-1 text-[10px] font-normal normal-case">
              ({activeCount}/{agents.length})
            </span>
          )}
        </button>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1 rounded-md hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCwIcon className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>
      </div>

      {/* Agent list */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1.5">
              {loading && agents.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCwIcon className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-xs text-red-500 text-center py-2">{error}</div>
              ) : (
                agents.map((agent) => (
                  <ExternalAgentCard key={agent.pid} agent={agent} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
