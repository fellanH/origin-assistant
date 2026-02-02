import { html, nothing } from "lit";
import { icons } from "../icons";

export type ScrollButtonConfig = {
  visible: boolean;
  onClick: () => void;
  unreadCount?: number;
  label?: string;
};

/**
 * A scroll-to-bottom button that appears when not at the bottom of the conversation.
 * Shows unread message count badge when applicable.
 */
export function renderScrollButton(config: ScrollButtonConfig) {
  const { visible, onClick, unreadCount = 0, label = "Scroll to bottom" } = config;

  if (!visible) return nothing;

  return html`
    <button
      class="scroll-button"
      @click=${onClick}
      title=${label}
      aria-label=${label}
    >
      ${icons.chevronDown ?? html`<span>↓</span>`}
      ${unreadCount > 0
        ? html`<span class="scroll-button__badge">${unreadCount > 99 ? "99+" : unreadCount}</span>`
        : nothing}
    </button>
  `;
}

/**
 * Creates a scroll observer for auto-scroll and scroll button visibility.
 * Returns cleanup function.
 */
export function createScrollObserver(
  container: HTMLElement,
  callbacks: {
    onAtBottom: (atBottom: boolean) => void;
    threshold?: number;
  },
): () => void {
  const { onAtBottom, threshold = 100 } = callbacks;

  const checkScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom <= threshold;
    onAtBottom(atBottom);
  };

  container.addEventListener("scroll", checkScroll, { passive: true });
  checkScroll(); // Initial check

  return () => {
    container.removeEventListener("scroll", checkScroll);
  };
}

/**
 * Scrolls container to bottom with optional smooth animation.
 */
export function scrollToBottom(container: HTMLElement, smooth = true) {
  container.scrollTo({
    top: container.scrollHeight,
    behavior: smooth ? "smooth" : "instant",
  });
}
