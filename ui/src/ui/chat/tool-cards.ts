import { html, nothing } from "lit";

import { formatToolDetail, resolveToolDisplay } from "../tool-display";
import { icons } from "../icons";
import type { ToolCard, ToolInvocationState } from "../types/chat-types";
import { TOOL_INLINE_THRESHOLD } from "./constants";
import { formatToolOutputForSidebar, getTruncatedPreview } from "./tool-helpers";
import { isToolResultMessage } from "./message-normalizer";
import { extractTextCached } from "./message-extract";

/** Callback for tool approval responses */
export type ToolApprovalHandler = (approvalId: string, approved: boolean) => void;

export function extractToolCards(message: unknown): ToolCard[] {
  const m = message as Record<string, unknown>;
  const content = normalizeContent(m.content);
  const cards: ToolCard[] = [];

  for (const item of content) {
    const kind = String(item.type ?? "").toLowerCase();
    const isToolCall =
      ["toolcall", "tool_call", "tooluse", "tool_use"].includes(kind) ||
      (typeof item.name === "string" && item.arguments != null);
    if (isToolCall) {
      cards.push({
        kind: "call",
        name: (item.name as string) ?? "tool",
        args: coerceArgs(item.arguments ?? item.args),
      });
    }
  }

  for (const item of content) {
    const kind = String(item.type ?? "").toLowerCase();
    if (kind !== "toolresult" && kind !== "tool_result") continue;
    const text = extractToolText(item);
    const name = typeof item.name === "string" ? item.name : "tool";
    cards.push({ kind: "result", name, text });
  }

  if (isToolResultMessage(message) && !cards.some((card) => card.kind === "result")) {
    const name =
      (typeof m.toolName === "string" && m.toolName) ||
      (typeof m.tool_name === "string" && m.tool_name) ||
      "tool";
    const text = extractTextCached(message) ?? undefined;
    cards.push({ kind: "result", name, text });
  }

  return cards;
}

/** Get state indicator icon and class */
function getStateIndicator(state?: ToolInvocationState): { icon: unknown; className: string; label: string } {
  switch (state) {
    case "calling":
      return { icon: icons.loader, className: "chat-tool-card--calling", label: "Calling..." };
    case "executing":
      return { icon: icons.loader, className: "chat-tool-card--executing", label: "Running..." };
    case "awaiting-approval":
      return { icon: icons.alertTriangle, className: "chat-tool-card--approval", label: "Awaiting approval" };
    case "error":
      return { icon: icons.alertCircle, className: "chat-tool-card--error", label: "Error" };
    case "complete":
    default:
      return { icon: icons.check, className: "chat-tool-card--complete", label: "Completed" };
  }
}

/** Render tool approval buttons */
function renderApprovalUI(
  card: ToolCard,
  display: { label: string },
  detail: string | null,
  onApproval?: ToolApprovalHandler,
) {
  if (!card.approvalId || !onApproval) return nothing;

  const handleApprove = (e: Event) => {
    e.stopPropagation();
    onApproval(card.approvalId!, true);
  };

  const handleDeny = (e: Event) => {
    e.stopPropagation();
    onApproval(card.approvalId!, false);
  };

  return html`
    <div class="chat-tool-approval">
      <div class="chat-tool-approval__warning">
        ${icons.alertTriangle}
        <span>This tool requires approval before execution</span>
      </div>
      ${detail ? html`<code class="chat-tool-approval__command">${detail}</code>` : nothing}
      <div class="chat-tool-approval__actions">
        <button class="chat-tool-approval__btn chat-tool-approval__btn--approve" @click=${handleApprove}>
          ${icons.check} Approve
        </button>
        <button class="chat-tool-approval__btn chat-tool-approval__btn--deny" @click=${handleDeny}>
          ${icons.x} Deny
        </button>
      </div>
    </div>
  `;
}

export function renderToolCardSidebar(
  card: ToolCard,
  onOpenSidebar?: (content: string) => void,
  onApproval?: ToolApprovalHandler,
) {
  const display = resolveToolDisplay({ name: card.name, args: card.args });
  const detail = formatToolDetail(display);
  const hasText = Boolean(card.text?.trim());
  const state = card.state ?? (card.kind === "result" ? "complete" : "calling");
  const stateInfo = getStateIndicator(state);

  // If awaiting approval, show approval UI
  if (state === "awaiting-approval") {
    return html`
      <div class="chat-tool-card ${stateInfo.className}">
        <div class="chat-tool-card__header">
          <div class="chat-tool-card__title">
            <span class="chat-tool-card__icon">${icons[display.icon]}</span>
            <span>${display.label}</span>
          </div>
          <span class="chat-tool-card__state chat-tool-card__state--approval">
            ${stateInfo.icon}
            <span>${stateInfo.label}</span>
          </span>
        </div>
        ${renderApprovalUI(card, display, detail, onApproval)}
      </div>
    `;
  }

  const canClick = Boolean(onOpenSidebar) && state === "complete";
  const handleClick = canClick
    ? () => {
        if (hasText) {
          onOpenSidebar!(formatToolOutputForSidebar(card.text!));
          return;
        }
        const info = `## ${display.label}\n\n${
          detail ? `**Command:** \`${detail}\`\n\n` : ""
        }*No output — tool completed successfully.*`;
        onOpenSidebar!(info);
      }
    : undefined;

  const isShort = hasText && (card.text?.length ?? 0) <= TOOL_INLINE_THRESHOLD;
  const showCollapsed = hasText && !isShort && state === "complete";
  const showInline = hasText && isShort && state === "complete";
  const showStatus = state !== "complete" || (!hasText && card.kind === "result");
  const isActive = state === "calling" || state === "executing";

  return html`
    <div
      class="chat-tool-card ${stateInfo.className} ${canClick ? "chat-tool-card--clickable" : ""}"
      @click=${handleClick}
      role=${canClick ? "button" : nothing}
      tabindex=${canClick ? "0" : nothing}
      @keydown=${
        canClick
          ? (e: KeyboardEvent) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              handleClick?.();
            }
          : nothing
      }
    >
      <div class="chat-tool-card__header">
        <div class="chat-tool-card__title">
          <span class="chat-tool-card__icon ${isActive ? "chat-tool-card__icon--spin" : ""}">${
            isActive ? icons.loader : icons[display.icon]
          }</span>
          <span>${display.label}</span>
        </div>
        ${
          canClick
            ? html`<span class="chat-tool-card__action">${hasText ? "View" : ""} ${icons.check}</span>`
            : html`<span class="chat-tool-card__state">${stateInfo.icon}</span>`
        }
      </div>
      ${detail ? html`<div class="chat-tool-card__detail">${detail}</div>` : nothing}
      ${card.error ? html`<div class="chat-tool-card__error">${card.error}</div>` : nothing}
      ${
        showStatus
          ? html`<div class="chat-tool-card__status-text ${state === "error" ? "error" : "muted"}">${stateInfo.label}</div>`
          : nothing
      }
      ${
        showCollapsed
          ? html`<div class="chat-tool-card__preview mono">${getTruncatedPreview(card.text!)}</div>`
          : nothing
      }
      ${showInline ? html`<div class="chat-tool-card__inline mono">${card.text}</div>` : nothing}
    </div>
  `;
}

function normalizeContent(content: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(content)) return [];
  return content.filter(Boolean) as Array<Record<string, unknown>>;
}

function coerceArgs(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractToolText(item: Record<string, unknown>): string | undefined {
  if (typeof item.text === "string") return item.text;
  if (typeof item.content === "string") return item.content;
  return undefined;
}
