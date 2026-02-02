import { html, nothing } from "lit";
import { icons } from "../icons";

export type MessageActionId = "copy" | "retry" | "like" | "dislike";

export type MessageActionsConfig = {
  onCopy?: () => void;
  onRetry?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  showCopy?: boolean;
  showRetry?: boolean;
  showLike?: boolean;
  showDislike?: boolean;
  liked?: boolean;
  disliked?: boolean;
  copyLabel?: string;
  copiedLabel?: string;
};

type ActionState = {
  copied: boolean;
};

const state: ActionState = {
  copied: false,
};

function handleCopy(text: string, onCopy?: () => void) {
  navigator.clipboard.writeText(text).then(() => {
    state.copied = true;
    onCopy?.();
    setTimeout(() => {
      state.copied = false;
    }, 2000);
  });
}

export function renderMessageActions(
  text: string,
  config: MessageActionsConfig = {},
) {
  const {
    onCopy,
    onRetry,
    onLike,
    onDislike,
    showCopy = true,
    showRetry = false,
    showLike = false,
    showDislike = false,
    liked = false,
    disliked = false,
    copyLabel = "Copy",
    copiedLabel = "Copied!",
  } = config;

  const hasAnyAction = showCopy || showRetry || showLike || showDislike;
  if (!hasAnyAction) return nothing;

  return html`
    <div class="message-actions">
      ${showCopy
        ? html`
            <button
              class="message-action"
              @click=${() => handleCopy(text, onCopy)}
              title=${state.copied ? copiedLabel : copyLabel}
              aria-label=${state.copied ? copiedLabel : copyLabel}
            >
              ${state.copied ? icons.check : icons.copy}
            </button>
          `
        : nothing}
      ${showRetry && onRetry
        ? html`
            <button
              class="message-action"
              @click=${onRetry}
              title="Retry"
              aria-label="Retry"
            >
              ${icons.loader}
            </button>
          `
        : nothing}
      ${showLike && onLike
        ? html`
            <button
              class="message-action ${liked ? "message-action--active" : ""}"
              @click=${onLike}
              title="Like"
              aria-label="Like"
              aria-pressed=${liked}
            >
              ${icons.thumbsUp ?? icons.check}
            </button>
          `
        : nothing}
      ${showDislike && onDislike
        ? html`
            <button
              class="message-action ${disliked ? "message-action--active" : ""}"
              @click=${onDislike}
              title="Dislike"
              aria-label="Dislike"
              aria-pressed=${disliked}
            >
              ${icons.thumbsDown ?? icons.x}
            </button>
          `
        : nothing}
    </div>
  `;
}
