# Research: Internalize Tool Registration

**Date:** 2026-02-03  
**Status:** Complete - Ready for implementation

## Summary

The `internalize` tool can be registered in Origin's tool system. This requires:
1. Converting the schema from Zod to TypeBox (the tool system's schema library)
2. Creating a proper tool factory function
3. Registering it in `openclaw-tools.ts`

**Estimated effort:** Quick win (~30 min)

---

## How Tools Work in Origin

### Tool Structure

Tools implement the `AnyAgentTool` interface from `@mariozechner/pi-agent-core`:

```typescript
{
  label: string;           // Human-readable name (e.g., "Memory Search")
  name: string;            // Tool identifier for LLM (e.g., "memory_search")
  description: string;     // What the tool does (shown to LLM)
  parameters: TSchema;     // TypeBox schema for input validation
  execute: (toolCallId: string, params: unknown) => Promise<AgentToolResult>;
}
```

### Schema Library

**Important:** The tool system uses **TypeBox** (`@sinclair/typebox`), not Zod.

```typescript
import { Type } from "@sinclair/typebox";

const Schema = Type.Object({
  action: Type.Union([
    Type.Literal("anchor"),
    Type.Literal("insight"),
    // ...
  ]),
  text: Type.String({ description: "The content to internalize" }),
  type: Type.Optional(Type.String()),
});
```

### Registration Flow

1. Tool factory creates the tool → `src/agents/tools/`
2. Factory is called in `createOpenClawTools()` → `src/agents/openclaw-tools.ts`
3. Tools array is merged into `createOpenClawCodingTools()` → `src/agents/pi-tools.ts`
4. Tools are exposed to the LLM during sessions

---

## Current State of internalize-tool.ts

The current implementation uses Zod for its schema:

```typescript
// Current (Zod-based - won't work with tool system)
export const internalizeToolSchema = z.object({
  action: z.enum([
    "anchor",
    "open_loop", 
    "resolve_loop",
    "insight",
    "stream_tail",
    "self_observation",
  ]),
  text: z.string().describe("The content to internalize"),
  type: z.string().optional().describe("Subtype (e.g., anchor trigger type)"),
  weight: z.enum(["high", "medium", "low"]).optional(),
  context: z.string().optional(),
});
```

---

## Proposed Changes

### 1. Create Tool Factory File

**File:** `src/agents/tools/internalize-tool.ts`

```typescript
import { Type } from "@sinclair/typebox";

import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam } from "./common.js";
import { internalizeTool as executeInternalize } from "../../cognition/internalize-tool.js";

const InternalizeSchema = Type.Object({
  action: Type.Union([
    Type.Literal("anchor"),
    Type.Literal("open_loop"),
    Type.Literal("resolve_loop"),
    Type.Literal("insight"),
    Type.Literal("stream_tail"),
    Type.Literal("self_observation"),
  ], { description: "Type of internalization" }),
  text: Type.String({ description: "The content to internalize" }),
  type: Type.Optional(Type.String({ 
    description: "Subtype (e.g., anchor trigger type: identity_anchor, structural_insight, epiphany)" 
  })),
  weight: Type.Optional(Type.Union([
    Type.Literal("high"),
    Type.Literal("medium"),
    Type.Literal("low"),
  ], { description: "Emotional/importance weight" })),
  context: Type.Optional(Type.String({ description: "Additional context" })),
});

export function createInternalizeTool(): AnyAgentTool {
  return {
    label: "Internalize",
    name: "internalize",
    description: `Memory formation tool for capturing meaningful moments and insights.

Actions:
- anchor: Capture a verbatim phrase that triggers recognition (use type: identity_anchor, structural_insight, epiphany, etc.)
- insight: Record a sudden realization or crystallization of understanding
- open_loop: Create unfinished business that needs resolution
- resolve_loop: Mark an open loop as complete
- stream_tail: Capture raw momentum/direction from current thinking (end-of-session)
- self_observation: Note a pattern about your own behavior (type: strength, growth_edge, pattern, uncertainty)

Use this when something feels worth remembering — not for routine information, but for moments that shape who you are.`,
    parameters: InternalizeSchema,
    execute: async (_toolCallId, params) => {
      const p = params as Record<string, unknown>;
      const action = readStringParam(p, "action", { required: true });
      const text = readStringParam(p, "text", { required: true });
      const type = readStringParam(p, "type");
      const weight = readStringParam(p, "weight") as "high" | "medium" | "low" | undefined;
      const context = readStringParam(p, "context");

      try {
        const result = await executeInternalize({
          action: action as "anchor" | "open_loop" | "resolve_loop" | "insight" | "stream_tail" | "self_observation",
          text,
          type,
          weight,
          context,
        });
        return jsonResult({ success: true, message: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ success: false, error: message });
      }
    },
  };
}
```

### 2. Register in openclaw-tools.ts

**File:** `src/agents/openclaw-tools.ts`

Add import:
```typescript
import { createInternalizeTool } from "./tools/internalize-tool.js";
```

Add to the tools array (around line 75):
```typescript
const tools: AnyAgentTool[] = [
  createBrowserTool({...}),
  createCanvasTool(),
  createInternalizeTool(),  // ← Add here
  createNodesTool({...}),
  // ... rest of tools
];
```

---

## Alternative: Conditional Registration

If you want the tool to only appear for certain agents (e.g., only "origin"):

```typescript
export function createOpenClawTools(options?: {
  // ... existing options
  enableCognition?: boolean;  // ← Add option
}): AnyAgentTool[] {
  // ...
  
  const tools: AnyAgentTool[] = [
    // ...
    ...(options?.enableCognition ? [createInternalizeTool()] : []),
    // ...
  ];
}
```

Then pass `enableCognition: true` for the origin agent.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/agents/tools/internalize-tool.ts` | **Create** - Tool factory |
| `src/agents/openclaw-tools.ts` | **Modify** - Add import + registration |

---

## Testing

After registration, the tool should:
1. Appear in the tool list when running a session
2. Be callable via: `internalize(action: "insight", text: "Direction matters more than history")`
3. Persist to `cognition/self-state.json`

Quick test:
```bash
cd /Users/admin/dev/origin
pnpm test src/agents/tools/internalize-tool.test.ts
```

---

## Notes

- The Zod schema in `internalize-tool.ts` can stay for internal validation
- TypeBox schema is only for LLM-facing parameter description
- Consider adding tool policy gating later (e.g., `tools.allow: ["internalize"]`)

---

## References

- Manifesto: `/MANIFESTO.md`
- Tool implementation: `/src/cognition/internalize-tool.ts`
- Schema: `/src/cognition/self-state.schema.ts`
- Example tool: `/src/agents/tools/memory-tool.ts`
- Registration point: `/src/agents/openclaw-tools.ts`
