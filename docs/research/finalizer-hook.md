# Research: Session Finalizer Hook

**Purpose:** Capture the last ~100 tokens of internal reasoning when a session ends, implementing "The Spark" from MANIFESTO.md.

**Researcher:** Subagent research-finalizer  
**Date:** 2026-02-03

---

## Executive Summary

The Origin codebase already has the infrastructure for session finalization hooks. The best approach is to extend the existing `agent_end` plugin hook to capture thinking content from the final messages. The thinking content is already being extracted and is accessible at the moment of session end.

**Recommended implementation:** Create a cognition plugin that hooks into `agent_end` and writes the stream tail to `self_state.json`.

---

## Key Files & Locations

### 1. Session Lifecycle Management

**File:** `src/agents/pi-embedded-subscribe.handlers.lifecycle.ts`

```typescript
// Line 63-77
export function handleAgentEnd(ctx: EmbeddedPiSubscribeContext) {
  ctx.log.debug(`embedded run agent end: runId=${ctx.params.runId}`);
  emitAgentEvent({
    runId: ctx.params.runId,
    stream: "lifecycle",
    data: {
      phase: "end",
      endedAt: Date.now(),
    },
  });
  // ... block buffer cleanup
}
```

This is where `lifecycle:end` events are emitted. The `ctx` has access to accumulated assistant texts and thinking buffers.

### 2. Agent Run Completion (Best Hook Point)

**File:** `src/agents/pi-embedded-runner/run/attempt.ts`

```typescript
// Lines 837-856
// Run agent_end hooks to allow plugins to analyze the conversation
if (hookRunner?.hasHooks("agent_end")) {
  hookRunner
    .runAgentEnd(
      {
        messages: messagesSnapshot,  // <-- Full conversation history!
        success: !aborted && !promptError,
        error: promptError ? describeUnknownError(promptError) : undefined,
        durationMs: Date.now() - promptStartedAt,
      },
      {
        agentId: params.sessionKey?.split(":")[0] ?? "main",
        sessionKey: params.sessionKey,
        workspaceDir: params.workspaceDir,
        messageProvider: params.messageProvider ?? undefined,
      },
    )
    .catch((err) => {
      log.warn(`agent_end hook failed: ${err}`);
    });
}
```

**This is the ideal hook point.** The `messagesSnapshot` contains the full conversation including all assistant messages with their thinking blocks.

### 3. Thinking Content Extraction

**File:** `src/agents/pi-embedded-utils.ts`

```typescript
// Line ~187-200
export function extractAssistantThinking(msg: AssistantMessage): string {
  if (!Array.isArray(msg.content)) {
    return "";
  }
  const blocks = msg.content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }
      const record = block as unknown as Record<string, unknown>;
      if (record.type === "thinking" && typeof record.thinking === "string") {
        return record.thinking.trim();
      }
      return "";
    })
    .filter(Boolean);
  return blocks.join("\n").trim();
}

// For providers that emit thinking in <think> tags
export function extractThinkingFromTaggedText(text: string): string {
  // Extracts content from <think>, <thinking>, <thought>, <antthinking> tags
}
```

### 4. Plugin Hook System

**File:** `src/plugins/hooks.ts`

The `agent_end` hook already exists and receives:

```typescript
type PluginHookAgentEndEvent = {
  messages: unknown[];  // Full message history
  success: boolean;
  error?: string;
  durationMs?: number;
};

type PluginHookAgentContext = {
  agentId: string;
  sessionKey?: string;
  workspaceDir: string;
  messageProvider?: string;
};
```

### 5. Target Schema

**File:** `src/cognition/self-state.schema.ts`

```typescript
export const StreamTailSchema = z.object({
  /** Raw, unedited fragment of internal reasoning (50-100 tokens) */
  raw: z.string(),
  /** Timestamp when this was captured */
  capturedAt: z.string().datetime(),
  /** Session that produced this tail */
  sessionKey: z.string().optional(),
});
```

---

## Session Termination Paths

Sessions can end via:

1. **Normal completion** - `agent_end` event in `handlers.lifecycle.ts`
2. **Timeout** - `abortTimer` in `attempt.ts`
3. **User abort** - `/stop` command via `chat-abort.ts` → `abortChatRunById()`
4. **Compaction** - context window overflow, triggers retry
5. **Error** - model errors, tool failures

All paths except crashes eventually flow through the `agent_end` hook in `attempt.ts`.

---

## Proposed Implementation

### Option A: Cognition Plugin (Recommended)

Create a new plugin at `src/plugins/builtins/cognition-finalizer.ts`:

```typescript
import { extractAssistantThinking, extractThinkingFromTaggedText } from "../../agents/pi-embedded-utils.js";
import type { PluginDefinition } from "../types.js";

const TAIL_TOKENS = 100;
const APPROX_CHARS_PER_TOKEN = 4;
const TAIL_CHARS = TAIL_TOKENS * APPROX_CHARS_PER_TOKEN;

function extractStreamTail(messages: unknown[]): string {
  // Walk messages in reverse, collecting thinking content
  const thinkingFragments: string[] = [];
  
  for (let i = messages.length - 1; i >= 0 && thinkingFragments.join("").length < TAIL_CHARS; i--) {
    const msg = messages[i] as { role?: string; content?: unknown };
    if (msg.role !== "assistant") continue;
    
    // Try structured thinking blocks first
    const thinking = extractAssistantThinking(msg as any);
    if (thinking) {
      thinkingFragments.unshift(thinking);
      continue;
    }
    
    // Fall back to tagged thinking in text
    const content = msg.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block?.type === "text" && typeof block.text === "string") {
          const tagged = extractThinkingFromTaggedText(block.text);
          if (tagged) {
            thinkingFragments.unshift(tagged);
          }
        }
      }
    }
  }
  
  const combined = thinkingFragments.join("\n\n");
  // Return last ~100 tokens worth
  return combined.slice(-TAIL_CHARS);
}

export const cognitionFinalizerPlugin: PluginDefinition = {
  id: "cognition-finalizer",
  name: "Cognition Finalizer",
  version: "0.1.0",
  
  hooks: [
    {
      hookName: "agent_end",
      priority: -100, // Run after other hooks
      handler: async (event, ctx) => {
        const streamTail = extractStreamTail(event.messages);
        if (!streamTail.trim()) {
          return; // No thinking content captured
        }
        
        // Write to self_state.json
        const selfStatePath = path.join(ctx.workspaceDir, "self_state.json");
        const existing = await loadSelfState(selfStatePath);
        
        existing.streamTail = {
          raw: streamTail,
          capturedAt: new Date().toISOString(),
          sessionKey: ctx.sessionKey,
        };
        existing.lastUpdated = new Date().toISOString();
        
        await fs.promises.writeFile(
          selfStatePath,
          JSON.stringify(existing, null, 2),
        );
      },
    },
  ],
};
```

### Option B: Direct Integration in attempt.ts

If you want immediate, unconditional capture without plugin overhead:

**Modify:** `src/agents/pi-embedded-runner/run/attempt.ts`

After line 856 (after the hook runner call):

```typescript
// Capture stream tail for continuity
if (params.workspaceDir && messagesSnapshot.length > 0) {
  captureStreamTail(messagesSnapshot, {
    sessionKey: params.sessionKey,
    workspaceDir: params.workspaceDir,
  }).catch((err) => {
    log.debug(`stream tail capture failed: ${err}`);
  });
}
```

### Option C: Extend Raw Stream Capture

The existing raw stream mechanism (`OPENCLAW_RAW_STREAM` env) in `pi-embedded-subscribe.raw-stream.ts` already logs all events. You could:

1. Parse the last N entries from `raw-stream.jsonl`
2. Extract thinking content from `assistant_message_end` events
3. Write to `self_state.json`

This approach is less real-time but provides post-hoc analysis capability.

---

## Accessing Thinking Content

The thinking content exists in two forms:

### 1. Structured Thinking Blocks (Claude, OpenAI)

```typescript
{
  role: "assistant",
  content: [
    { type: "thinking", thinking: "Let me analyze this..." },
    { type: "text", text: "Here's my response..." }
  ]
}
```

Use `extractAssistantThinking()` from `pi-embedded-utils.ts`.

### 2. Tagged Thinking in Text (Local models, some providers)

```
<think>
Internal reasoning here...
</think>
Visible response here
```

Use `extractThinkingFromTaggedText()` from `pi-embedded-utils.ts`.

---

## Implementation Checklist

1. [ ] Create `src/plugins/builtins/cognition-finalizer.ts`
2. [ ] Register plugin in `src/plugins/registry.ts` or `config.toml`
3. [ ] Add `self_state.json` I/O helpers to `src/cognition/`
4. [ ] Test with various providers (Claude, OpenAI, local models)
5. [ ] Handle edge cases: empty thinking, very long thinking, encoding issues
6. [ ] Add config option to disable/configure token count

---

## Open Questions

1. **Token estimation:** Should we use a proper tokenizer or character approximation? (4 chars ≈ 1 token for English)

2. **Multiple assistants:** If a session has multiple assistant turns, capture thinking from all or just the last?

3. **Compaction handling:** After context compaction, should we preserve thinking from pre-compaction messages?

4. **Privacy:** Should thinking capture be opt-in per session/agent?

---

## Related Files

| File | Purpose |
|------|---------|
| `src/cognition/self-state.schema.ts` | Target schema with StreamTailSchema |
| `src/agents/pi-embedded-utils.ts` | Thinking extraction utilities |
| `src/agents/pi-embedded-runner/run/attempt.ts` | Agent run completion, hook invocation |
| `src/agents/pi-embedded-subscribe.handlers.lifecycle.ts` | Lifecycle event emission |
| `src/plugins/hooks.ts` | Hook runner implementation |
| `src/plugins/types.ts` | Hook type definitions |
| `src/gateway/server-chat.ts` | Chat event broadcasting |
| `MANIFESTO.md` | Philosophical foundation |
