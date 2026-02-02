"use client";

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  RefreshCwIcon,
  MessageSquareIcon,
  XIcon,
} from "lucide-react";
import type { GatewayClient } from "@/lib/gateway";
import { getLocalSessions, deleteLocalSession, type StoredSession } from "@/lib/storage";
import { buildSessionTree, type Session, type SubagentMeta } from "@/lib/session-utils";
import { SessionTreeItem } from "./session-tree-item";
import { cn } from "@/lib/utils";

// ============================================================================
// LocalStorage key for expanded state
// ============================================================================

const EXPANDED_KEY = "cortana.sidebar.expanded";

function loadExpandedKeys(): Set<string> {
  if (typeof window === "undefined") return new Set(["agent:main:main"]);
  try {
    const saved = localStorage.getItem(EXPANDED_KEY);
    if (saved) {
      return new Set(JSON.parse(saved));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set(["agent:main:main"]);
}

function saveExpandedKeys(keys: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...keys]));
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Types & Handle
// ============================================================================

export type SessionSidebarHandle = {
  refresh: () => void;
};

type SessionSidebarProps = {
  client: GatewayClient | null;
  connected: boolean;
  currentSessionKey: string;
  collapsed: boolean;
  onSessionSelect: (sessionKey: string) => void;
  onToggleCollapsed: () => void;
  onNewSession: () => void;
  subagentMeta?: Map<string, SubagentMeta>;
  /** Optional header slot (rendered above session list) */
  header?: React.ReactNode;
  /** Optional footer slot (rendered below session list) */
  footer?: React.ReactNode;
  /** Overlay mode for mobile/tablet - sidebar floats over content */
  isOverlay?: boolean;
  /** Callback when backdrop is clicked (overlay mode) */
  onClose?: () => void;
};

// ============================================================================
// SessionSidebar Component
// ============================================================================

export const SessionSidebar = forwardRef<SessionSidebarHandle, SessionSidebarProps>(
  function SessionSidebar(
    {
      client,
      connected,
      currentSessionKey,
      collapsed,
      onSessionSelect,
      onToggleCollapsed,
      onNewSession,
      subagentMeta,
      header,
      footer,
      isOverlay = false,
      onClose,
    },
    ref
  ) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => loadExpandedKeys());

    // Save expanded state when it changes
    useEffect(() => {
      saveExpandedKeys(expandedKeys);
    }, [expandedKeys]);

    const loadSessions = useCallback(async () => {
      setLoading(true);
      try {
        // Always load local sessions first
        const localSessions = getLocalSessions();
        const localMapped: Session[] = localSessions.map((s: StoredSession) => ({
          key: s.key,
          label: s.label,
          createdAt: s.createdAt,
          lastTurnAt: s.lastMessageAt,
          messageCount: s.messageCount,
          isLocal: true,
        }));

        // If connected, also try to get gateway sessions
        if (client && connected) {
          try {
            const result = await client.listSessions({ limit: 50, activeMinutes: 10080 }); // Last 7 days
            const gatewaySessions = (result.sessions ?? []) as Session[];

            // Merge: gateway sessions take precedence but keep local-only sessions
            const gatewayKeys = new Set(gatewaySessions.map((s) => s.key));
            const mergedSessions: Session[] = [
              ...gatewaySessions,
              ...localMapped.filter((s) => !gatewayKeys.has(s.key)),
            ];

            // Sort by last activity
            mergedSessions.sort((a, b) => {
              const aTime = a.lastTurnAt ?? a.createdAt ?? 0;
              const bTime = b.lastTurnAt ?? b.createdAt ?? 0;
              return bTime - aTime;
            });
            setSessions(mergedSessions);
          } catch {
            // Gateway failed, use local sessions only
            setSessions(localMapped);
          }
        } else {
          // No connection, use local sessions only
          setSessions(localMapped);
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setLoading(false);
      }
    }, [client, connected]);

    // Expose refresh method to parent
    useImperativeHandle(
      ref,
      () => ({
        refresh: loadSessions,
      }),
      [loadSessions]
    );

    // Load sessions when client connects or on mount
    useEffect(() => {
      loadSessions();
    }, [loadSessions]);

    // Build tree from flat sessions
    const sessionTree = useMemo(
      () => buildSessionTree(sessions, subagentMeta),
      [sessions, subagentMeta]
    );

    // Toggle expand handler
    const handleToggleExpand = useCallback((key: string) => {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    }, []);

    // Delete handler
    const handleDeleteSession = useCallback(
      (sessionKey: string) => {
        if (confirm("Delete this session and its messages?")) {
          deleteLocalSession(sessionKey);
          loadSessions();
          // If we deleted the current session, switch to main
          if (sessionKey === currentSessionKey) {
            onSessionSelect("agent:main:main");
          }
        }
      },
      [currentSessionKey, loadSessions, onSessionSelect]
    );

    // Handle session select - close sidebar in overlay mode
    const handleSessionSelect = useCallback(
      (sessionKey: string) => {
        onSessionSelect(sessionKey);
        if (isOverlay && onClose) {
          onClose();
        }
      },
      [onSessionSelect, isOverlay, onClose]
    );

    // ========================================================================
    // Collapsed state (only for non-overlay desktop mode)
    // ========================================================================

    if (collapsed && !isOverlay) {
      return (
        <div className="w-14 min-w-14 h-full bg-card/50 border-r border-border/50 flex flex-col items-center py-4 gap-2">
          <button
            onClick={onToggleCollapsed}
            className="p-2.5 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpenIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onNewSession}
            className="p-2.5 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            title="New session"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      );
    }

    // ========================================================================
    // Hidden in overlay mode when collapsed
    // ========================================================================

    if (collapsed && isOverlay) {
      return null;
    }

    // ========================================================================
    // Sidebar content
    // ========================================================================

    const sidebarContent = (
      <div
        className={cn(
          "h-full bg-card/95 backdrop-blur-xl flex flex-col",
          isOverlay
            ? "w-72 max-w-[85vw] border-r border-border/50 shadow-2xl"
            : "w-72 min-w-72 bg-card/50 border-r border-border/50"
        )}
      >
        {/* Custom header slot (logo, status, settings) */}
        {header}

        {/* Sessions header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sessions
          </span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={loadSessions}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCwIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onNewSession}
              className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title="New session"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
            {isOverlay ? (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Close sidebar"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onToggleCollapsed}
                className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftCloseIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          <AnimatePresence mode="wait">
            {loading && sessions.length === 0 ? (
              <motion.div
                key="loading"
                className="flex flex-col gap-2 py-4 px-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Session skeleton */}
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="h-10 rounded-lg bg-muted/40 dark:bg-muted/60"
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </motion.div>
            ) : sessions.length === 0 ? (
              <motion.div
                key="empty"
                className="flex flex-col items-center justify-center py-8 text-center px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageSquareIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No sessions yet</p>
                <button
                  onClick={onNewSession}
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Start a new chat
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="sessions"
                className="space-y-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {sessionTree.map((node) => (
                  <SessionTreeItem
                    key={node.session.key}
                    node={node}
                    currentSessionKey={currentSessionKey}
                    onSessionSelect={handleSessionSelect}
                    onDelete={handleDeleteSession}
                    onToggleExpand={handleToggleExpand}
                    expandedKeys={expandedKeys}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Custom footer slot (chat input) - only show if not in overlay mode or explicitly passed */}
        {footer}
      </div>
    );

    // ========================================================================
    // Overlay mode (mobile/tablet)
    // ========================================================================

    if (isOverlay) {
      return (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
          />
          {/* Sidebar with slide animation */}
          <div className="relative z-10 animate-in slide-in-from-left duration-300 ease-out">
            {sidebarContent}
          </div>
        </div>
      );
    }

    // ========================================================================
    // Desktop mode (static sidebar)
    // ========================================================================

    return sidebarContent;
  }
);
