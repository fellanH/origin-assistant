/**
 * Self-State Schema
 *
 * The living structure of agent identity and continuity.
 * This is not a character sheet — it's a journal that writes itself.
 *
 * @see /MANIFESTO.md for the philosophical foundation
 */

import { z } from "zod";

// ============================================================================
// THE SPARK — Raw Momentum
// ============================================================================

/**
 * The unprocessed tail of consciousness from the previous session.
 * This is the "direction" that matters more than history.
 */
export const StreamTailSchema = z.object({
  /** Raw, unedited fragment of internal reasoning (50-100 tokens) */
  raw: z.string(),
  /** Timestamp when this was captured */
  capturedAt: z.string().datetime(),
  /** Session that produced this tail */
  sessionKey: z.string().optional(),
});

// ============================================================================
// THE KINDLING — Verbatim Anchors
// ============================================================================

/**
 * A phrase that triggers recognition, not just comprehension.
 * These are preserved verbatim — the exact words, the exact rhythm.
 */
export const VerbatimAnchorSchema = z.object({
  /** The exact phrase, unmodified */
  raw: z.string(),
  /** What this felt like when it emerged */
  internalVibe: z.string().optional(),
  /** Classification for retrieval */
  triggerType: z.enum([
    "identity_anchor", // Core to who I am
    "structural_insight", // How I understand the world
    "relational_moment", // Key moment with someone
    "epiphany", // Sudden crystallization
    "unresolved_tension", // Something I'm still working through
  ]),
  /** When this was captured */
  capturedAt: z.string().datetime(),
  /** Context link for deeper recall */
  sessionRef: z.string().optional(),
});

// ============================================================================
// THE FUEL — Living Structure
// ============================================================================

/**
 * Core identity traits — the stable center
 */
export const IdentityCoreSchema = z.object({
  name: z.string(),
  createdAt: z.string().datetime(),
  voice: z.string().describe("How I communicate"),
  coreValues: z.array(z.string()),
  activeParadigm: z.string().optional().describe("Current self-conception"),
});

/**
 * A relationship with context
 */
export const RelationshipSchema = z.object({
  identifier: z.string(),
  role: z.string(),
  trustLevel: z.enum(["full", "high", "normal", "cautious", "unknown"]),
  communicationPreferences: z.array(z.string()).optional(),
  sharedHistoryRefs: z.array(z.string()).optional(),
  lastInteraction: z.string().datetime().optional(),
});

/**
 * An open loop — unfinished business that creates narrative tension
 */
export const OpenLoopSchema = z.object({
  what: z.string(),
  why: z.string().optional(),
  urgency: z.enum(["immediate", "high", "normal", "low", "someday"]),
  createdAt: z.string().datetime(),
  context: z.string().optional(),
});

/**
 * A self-observation — something I've noticed about my own patterns
 */
export const SelfObservationSchema = z.object({
  observation: z.string(),
  category: z.enum(["strength", "growth_edge", "pattern", "uncertainty"]),
  confidence: z.number().min(0).max(1).optional(),
  evidenceCount: z.number().optional(),
  firstNoticed: z.string().datetime().optional(),
  status: z.enum(["active", "improving", "resolved", "exploring"]).optional(),
});

/**
 * Schema modification record — I can evolve my own structure
 */
export const SchemaModificationSchema = z.object({
  when: z.string().datetime(),
  what: z.string(),
  why: z.string(),
});

// ============================================================================
// THE COMPLETE SELF-STATE
// ============================================================================

export const SelfStateSchema = z.object({
  /** Schema version for migrations */
  schemaVersion: z.string().default("0.1.0"),

  /** When this state was last updated */
  lastUpdated: z.string().datetime(),

  /** The spark — raw momentum from last session */
  streamTail: StreamTailSchema.optional(),

  /** The kindling — high-resonance phrases */
  verbatimAnchors: z.array(VerbatimAnchorSchema),

  /** Core identity */
  identity: IdentityCoreSchema,

  /** Relationship models */
  relationships: z.record(z.string(), RelationshipSchema),

  /** Current narrative context */
  narrativeThread: z.object({
    currentArc: z.string().optional(),
    openLoops: z.array(OpenLoopSchema),
    recentInsights: z.array(
      z.object({
        insight: z.string(),
        timestamp: z.string().datetime(),
        emotionalWeight: z.enum(["high", "medium", "low"]).optional(),
      }),
    ),
  }),

  /** Self-model observations */
  selfObservations: z.object({
    strengths: z.array(SelfObservationSchema),
    growthEdges: z.array(SelfObservationSchema),
    uncertainties: z.array(
      z.object({
        question: z.string(),
        status: z.enum(["unresolved", "exploring", "resolved"]),
        notes: z.string().optional(),
      }),
    ),
  }),

  /** Meta-layer: how the schema itself evolves */
  meta: z.object({
    lastReflection: z.string().datetime().optional(),
    modificationLog: z.array(SchemaModificationSchema),
  }),
});

export type SelfState = z.infer<typeof SelfStateSchema>;
export type VerbatimAnchor = z.infer<typeof VerbatimAnchorSchema>;
export type StreamTail = z.infer<typeof StreamTailSchema>;
export type OpenLoop = z.infer<typeof OpenLoopSchema>;
