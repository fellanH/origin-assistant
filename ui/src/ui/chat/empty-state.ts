import { html, nothing, type TemplateResult } from "lit";
import { icons } from "../icons";

export type ConversationEmptyStateConfig = {
  icon?: TemplateResult | string;
  title?: string;
  description?: string;
  suggestions?: Array<{
    label: string;
    onClick: () => void;
  }>;
};

/**
 * Empty state shown when conversation has no messages.
 * Includes optional icon, title, description, and suggestion chips.
 */
export function renderConversationEmptyState(config: ConversationEmptyStateConfig = {}) {
  const {
    icon = icons.messageSquare,
    title = "Start a conversation",
    description = "Type a message below to begin",
    suggestions = [],
  } = config;

  return html`
    <div class="conversation-empty-state">
      <div class="conversation-empty-state__icon">
        ${typeof icon === "string" ? html`<span>${icon}</span>` : icon}
      </div>
      <h3 class="conversation-empty-state__title">${title}</h3>
      ${description
        ? html`<p class="conversation-empty-state__description">${description}</p>`
        : nothing}
      ${suggestions.length > 0
        ? html`
            <div class="conversation-empty-state__suggestions">
              ${suggestions.map(
                (suggestion) => html`
                  <button
                    class="conversation-empty-state__suggestion"
                    @click=${suggestion.onClick}
                  >
                    ${suggestion.label}
                  </button>
                `,
              )}
            </div>
          `
        : nothing}
    </div>
  `;
}

/**
 * Quick suggestion chips for common prompts.
 */
export function renderSuggestionChips(
  suggestions: Array<{ label: string; prompt: string }>,
  onSelect: (prompt: string) => void,
) {
  if (!suggestions.length) return nothing;

  return html`
    <div class="suggestion-chips">
      ${suggestions.map(
        (s) => html`
          <button class="suggestion-chip" @click=${() => onSelect(s.prompt)}>
            ${s.label}
          </button>
        `,
      )}
    </div>
  `;
}
