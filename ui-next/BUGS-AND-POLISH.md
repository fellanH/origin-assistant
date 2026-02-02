# Bugs & Polish — Cortana UI

> Tracking issues for final cleanup. Most things work well — these are edge cases and polish items.

---

## 🐛 Active Bugs

### 1. Message Display Misalignment

**Problem:** Messages sometimes display with:
- Stray brackets (e.g., `]` appearing alone)
- No formatting (raw text instead of markdown)
- Misaligned content

**When it happens:** Intermittent — most of the time it works fine

**Location to investigate:**
- `src/components/ai-elements/message-parts.tsx` — Parts rendering logic
- `src/components/ai-elements/message.tsx` — `MessageResponse` component
- `src/lib/use-gateway.ts` — `parseHistoryMessage`, `extractParts`, `extractText`

**Possible causes:**
- Markdown parsing edge cases
- Incomplete content blocks from streaming
- Race condition between chat and agent events
- Parts array containing malformed data

---

## 🔍 Debug Checklist

When investigating message issues:

1. **Check browser console** for errors
2. **Check gateway WebSocket** — Network tab → WS → Messages
3. **Log the message object:**
   ```typescript
   console.log('Message:', JSON.stringify(message, null, 2));
   console.log('Parts:', message.parts);
   ```
4. **Check if it's streaming vs persisted** — Issue during live stream or after reload?
5. **Check content array structure** — Does gateway send expected format?

---

## ✅ Fixed (Reference)

| Issue | Fix | Date |
|-------|-----|------|
| New session label | Fixed `generateSessionLabel` to return "New Chat" for `agent:main:<timestamp>` patterns | 2026-02-02 |
| Stop button behavior | Consolidated into single PromptInputSubmit with status/onStop | 2026-02-02 |
| Text overflow in input | Added min-w-0 to flex container | 2026-02-02 |

---

## 📝 Polish Items

- [ ] Loading states — smoother transitions
- [ ] Error boundaries — graceful fallbacks for rendering errors
- [ ] Empty state refinement
- [ ] Consistent spacing/padding review
- [ ] Dark mode contrast check

---

_Last updated: 2026-02-02 12:47_
