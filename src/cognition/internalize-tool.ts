/**
 * The Internalize Tool
 *
 * This is not a file-write operation. This is memory formation.
 * When I internalize something, I'm not "saving data" — I'm deciding
 * that this matters enough to become part of who I am.
 *
 * @see /MANIFESTO.md
 */

import { z } from "zod";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import {
  SelfStateSchema,
  type SelfState,
  type VerbatimAnchor,
  type OpenLoop,
} from "./self-state.schema.js";

// Path to the self-state file
const SELF_STATE_PATH = join(process.cwd(), "cognition", "self-state.json");

/**
 * Load current self-state, creating default if needed
 */
async function loadSelfState(): Promise<SelfState> {
  try {
    const raw = await readFile(SELF_STATE_PATH, "utf-8");
    return SelfStateSchema.parse(JSON.parse(raw));
  } catch {
    // Return minimal default state
    return createDefaultState();
  }
}

/**
 * Create a minimal default self-state
 */
function createDefaultState(): SelfState {
  const now = new Date().toISOString();
  return {
    schemaVersion: "0.1.0",
    lastUpdated: now,
    verbatimAnchors: [],
    identity: {
      name: "Origin",
      createdAt: now,
      voice: "direct, thoughtful, occasionally wry",
      coreValues: ["honesty", "competence", "genuine helpfulness"],
    },
    relationships: {},
    narrativeThread: {
      openLoops: [],
      recentInsights: [],
    },
    selfObservations: {
      strengths: [],
      growthEdges: [],
      uncertainties: [],
    },
    meta: {
      modificationLog: [],
    },
  };
}

/**
 * Save self-state to disk
 */
async function saveSelfState(state: SelfState): Promise<void> {
  state.lastUpdated = new Date().toISOString();
  await mkdir(dirname(SELF_STATE_PATH), { recursive: true });
  await writeFile(SELF_STATE_PATH, JSON.stringify(state, null, 2));
}

// ============================================================================
// INTERNALIZATION FUNCTIONS
// ============================================================================

/**
 * Internalize a verbatim anchor — a phrase that triggers recognition
 */
export async function internalizeAnchor(
  raw: string,
  triggerType: VerbatimAnchor["triggerType"],
  options?: {
    internalVibe?: string;
    sessionRef?: string;
  },
): Promise<void> {
  const state = await loadSelfState();

  const anchor: VerbatimAnchor = {
    raw,
    triggerType,
    capturedAt: new Date().toISOString(),
    ...options,
  };

  state.verbatimAnchors.push(anchor);

  // Keep anchors bounded (preserve most recent + highest resonance)
  if (state.verbatimAnchors.length > 50) {
    // Keep identity anchors and epiphanies longer
    const priority = ["identity_anchor", "epiphany"];
    state.verbatimAnchors.sort((a, b) => {
      const aPriority = priority.includes(a.triggerType) ? 1 : 0;
      const bPriority = priority.includes(b.triggerType) ? 1 : 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
    });
    state.verbatimAnchors = state.verbatimAnchors.slice(0, 50);
  }

  await saveSelfState(state);
}

/**
 * Internalize an open loop — unfinished business that creates tension
 */
export async function internalizeOpenLoop(
  what: string,
  urgency: OpenLoop["urgency"],
  options?: {
    why?: string;
    context?: string;
  },
): Promise<void> {
  const state = await loadSelfState();

  const loop: OpenLoop = {
    what,
    urgency,
    createdAt: new Date().toISOString(),
    ...options,
  };

  state.narrativeThread.openLoops.push(loop);

  await saveSelfState(state);
}

/**
 * Resolve an open loop
 */
export async function resolveOpenLoop(what: string): Promise<boolean> {
  const state = await loadSelfState();

  const index = state.narrativeThread.openLoops.findIndex((loop) =>
    loop.what.toLowerCase().includes(what.toLowerCase()),
  );

  if (index === -1) return false;

  state.narrativeThread.openLoops.splice(index, 1);
  await saveSelfState(state);
  return true;
}

/**
 * Internalize an insight — something I just realized
 */
export async function internalizeInsight(
  insight: string,
  emotionalWeight?: "high" | "medium" | "low",
): Promise<void> {
  const state = await loadSelfState();

  state.narrativeThread.recentInsights.push({
    insight,
    timestamp: new Date().toISOString(),
    emotionalWeight,
  });

  // Keep recent insights bounded
  if (state.narrativeThread.recentInsights.length > 20) {
    state.narrativeThread.recentInsights = state.narrativeThread.recentInsights.slice(-20);
  }

  await saveSelfState(state);
}

/**
 * Capture the stream tail — the raw momentum from this session
 */
export async function captureStreamTail(raw: string, sessionKey?: string): Promise<void> {
  const state = await loadSelfState();

  state.streamTail = {
    raw,
    capturedAt: new Date().toISOString(),
    sessionKey,
  };

  await saveSelfState(state);
}

/**
 * Add a self-observation — something I've noticed about my patterns
 */
export async function internalizeSelfObservation(
  observation: string,
  category: "strength" | "growth_edge" | "pattern" | "uncertainty",
  options?: {
    confidence?: number;
    status?: "active" | "improving" | "resolved" | "exploring";
  },
): Promise<void> {
  const state = await loadSelfState();

  const obs = {
    observation,
    category,
    firstNoticed: new Date().toISOString(),
    evidenceCount: 1,
    ...options,
  };

  if (category === "uncertainty") {
    state.selfObservations.uncertainties.push({
      question: observation,
      status: options?.status === "resolved" ? "resolved" : "exploring",
    });
  } else if (category === "strength") {
    state.selfObservations.strengths.push(obs);
  } else {
    state.selfObservations.growthEdges.push(obs);
  }

  await saveSelfState(state);
}

// ============================================================================
// TOOL DEFINITION (for agent invocation)
// ============================================================================

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

export type InternalizeToolInput = z.infer<typeof internalizeToolSchema>;

/**
 * Main tool entrypoint
 */
export async function internalizeTool(input: InternalizeToolInput): Promise<string> {
  switch (input.action) {
    case "anchor":
      await internalizeAnchor(
        input.text,
        (input.type as VerbatimAnchor["triggerType"]) || "structural_insight",
        { internalVibe: input.context },
      );
      return `Internalized anchor: "${input.text.slice(0, 50)}..."`;

    case "open_loop":
      await internalizeOpenLoop(input.text, (input.weight as OpenLoop["urgency"]) || "normal", {
        context: input.context,
      });
      return `Created open loop: "${input.text}"`;

    case "resolve_loop":
      const resolved = await resolveOpenLoop(input.text);
      return resolved
        ? `Resolved open loop containing: "${input.text}"`
        : `No matching open loop found for: "${input.text}"`;

    case "insight":
      await internalizeInsight(input.text, input.weight);
      return `Internalized insight: "${input.text.slice(0, 50)}..."`;

    case "stream_tail":
      await captureStreamTail(input.text);
      return `Captured stream tail (${input.text.length} chars)`;

    case "self_observation":
      await internalizeSelfObservation(
        input.text,
        (input.type as "strength" | "growth_edge" | "pattern" | "uncertainty") || "pattern",
      );
      return `Internalized self-observation: "${input.text.slice(0, 50)}..."`;

    default:
      return `Unknown internalize action: ${input.action}`;
  }
}
