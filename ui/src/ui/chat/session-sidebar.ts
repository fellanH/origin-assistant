import { html, nothing } from "lit";
import { icons } from "../icons";
import { formatAgo } from "../format";
import type { GatewaySessionRow, SessionsListResult } from "../types";

export type SessionSidebarProps = {
  sessions: SessionsListResult | null;
  currentSessionKey: string;
  collapsed: boolean;
  loading?: boolean;
  onSessionSelect: (sessionKey: string) => void;
  onToggleCollapsed: () => void;
  onNewSession: () => void;
  onRefresh: () => void;
};

function getSessionDisplayName(session: GatewaySessionRow): string {
  if (session.label) return session.label;
  
  // Parse session key for display
  const parts = session.key.split(":");
  if (parts.length >= 3) {
    const channel = parts[0];
    const agentId = parts[1];
    const sessionId = parts[2];
    
    // Shorten for display
    if (channel === "agent" && agentId === "main") {
      return sessionId === "main" ? "Main Session" : `Session: ${sessionId.slice(0, 8)}`;
    }
    return `${channel}: ${sessionId.slice(0, 8)}`;
  }
  
  return session.key.slice(0, 16);
}

function getSessionIcon(session: GatewaySessionRow): unknown {
  const key = session.key.toLowerCase();
  if (key.includes("telegram")) return icons.messageSquare;
  if (key.includes("discord")) return icons.messageSquare;
  if (key.includes("whatsapp")) return icons.messageSquare;
  if (key.includes("signal")) return icons.messageSquare;
  return icons.messageCircle;
}

function renderSessionItem(
  session: GatewaySessionRow,
  isActive: boolean,
  onSelect: () => void
) {
  const displayName = getSessionDisplayName(session);
  const lastActive = session.lastTurnAt
    ? formatAgo(session.lastTurnAt)
    : session.createdAt
    ? formatAgo(session.createdAt)
    : null;

  return html`
    <button
      class="session-item ${isActive ? "session-item--active" : ""}"
      @click=${onSelect}
      title=${session.key}
    >
      <span class="session-item__icon">${getSessionIcon(session)}</span>
      <div class="session-item__content">
        <span class="session-item__name">${displayName}</span>
        ${lastActive ? html`<span class="session-item__time">${lastActive}</span>` : nothing}
      </div>
      ${session.reasoningLevel && session.reasoningLevel !== "off"
        ? html`<span class="session-item__badge" title="Reasoning: ${session.reasoningLevel}">🧠</span>`
        : nothing}
    </button>
  `;
}

export function renderSessionSidebar(props: SessionSidebarProps) {
  const sessions = props.sessions?.sessions ?? [];
  
  // Sort by last activity, most recent first
  const sortedSessions = [...sessions].sort((a, b) => {
    const aTime = a.lastTurnAt ?? a.createdAt ?? 0;
    const bTime = b.lastTurnAt ?? b.createdAt ?? 0;
    return bTime - aTime;
  });

  if (props.collapsed) {
    return html`
      <div class="session-sidebar session-sidebar--collapsed">
        <button
          class="session-sidebar__toggle"
          @click=${props.onToggleCollapsed}
          title="Expand sessions"
        >
          ${icons.chevronsRight}
        </button>
        <button
          class="session-sidebar__action"
          @click=${props.onNewSession}
          title="New session"
        >
          ${icons.plus}
        </button>
      </div>
    `;
  }

  return html`
    <div class="session-sidebar">
      <div class="session-sidebar__header">
        <span class="session-sidebar__title">Sessions</span>
        <div class="session-sidebar__actions">
          <button
            class="session-sidebar__action"
            @click=${props.onRefresh}
            title="Refresh sessions"
            ?disabled=${props.loading}
          >
            ${icons.refresh}
          </button>
          <button
            class="session-sidebar__action"
            @click=${props.onNewSession}
            title="New session"
          >
            ${icons.plus}
          </button>
          <button
            class="session-sidebar__toggle"
            @click=${props.onToggleCollapsed}
            title="Collapse sidebar"
          >
            ${icons.chevronsLeft}
          </button>
        </div>
      </div>
      
      <div class="session-sidebar__list">
        ${props.loading && sortedSessions.length === 0
          ? html`<div class="session-sidebar__empty">Loading...</div>`
          : sortedSessions.length === 0
          ? html`<div class="session-sidebar__empty">No sessions</div>`
          : sortedSessions.map((session) =>
              renderSessionItem(
                session,
                session.key === props.currentSessionKey,
                () => props.onSessionSelect(session.key)
              )
            )}
      </div>
    </div>
  `;
}
