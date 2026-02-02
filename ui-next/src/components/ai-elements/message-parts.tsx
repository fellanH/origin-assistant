"use client";

import { useMemo } from "react";
import type { MessagePart, ToolExecutionState, SubagentState } from "@/lib/use-gateway";
import { MessageResponse } from "./message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "./reasoning";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "./tool";
import { SubagentCard } from "./subagent-card";
import { InlineErrorBoundary, CompactErrorBoundary } from "@/components/error-boundary";

type MessagePartsProps = {
  content: string;
  parts?: MessagePart[];
  isStreaming?: boolean;
  toolExecutions?: Map<string, ToolExecutionState>;
  subagents?: Map<string, SubagentState>;
  onSubagentViewHistory?: (subagent: SubagentState) => void;
  onSubagentStop?: (subagent: SubagentState) => void;
};

/**
 * Helper to extract a preview string for tool metadata display.
 */
function formatToolMeta(name: string, args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const a = args as Record<string, unknown>;

  if (name === "Read" && a.file_path) return String(a.file_path);
  if (name === "Write" && a.file_path) return String(a.file_path);
  if (name === "Bash" && a.command) return String(a.command).slice(0, 50);
  if (name === "Glob" && a.pattern) return String(a.pattern);
  if (name === "Grep" && a.pattern) return String(a.pattern);
  if (name === "WebFetch" && a.url) return String(a.url);
  if (name === "Edit" && a.file_path) return String(a.file_path);

  return undefined;
}

/**
 * Map tool phase to Tool component state.
 */
function getToolState(phase: ToolExecutionState["phase"], isError?: boolean): "input-available" | "output-available" | "output-error" {
  if (phase === "executing") return "input-available";
  if (phase === "error" || isError) return "output-error";
  return "output-available";
}

/**
 * Renders structured message parts (text, reasoning, tool-call, tool-result).
 * Falls back to plain markdown rendering if no parts are present.
 */
export function MessageParts({
  content,
  parts,
  isStreaming,
  toolExecutions,
  subagents,
  onSubagentViewHistory,
  onSubagentStop,
}: MessagePartsProps) {
  // Compute which tools are already persisted in message.parts
  const persistedToolIds = useMemo(() => {
    if (!parts) return new Set<string>();
    return new Set(
      parts
        .filter((p) => p.type === "tool-call" || p.type === "tool-result")
        .map((p) => (p as { toolCallId: string }).toolCallId)
    );
  }, [parts]);

  // Pending tools: in toolExecutions but NOT in message.parts
  const pendingTools = useMemo(() => {
    if (!toolExecutions) return [];
    return Array.from(toolExecutions.entries()).filter(
      ([id]) => !persistedToolIds.has(id)
    );
  }, [toolExecutions, persistedToolIds]);

  // If parts exist, render them
  if (parts && parts.length > 0) {
    return (
      <>
        {parts.map((part, idx) => {
          switch (part.type) {
            case "text":
              return (
                <div key={idx} className="message-text">
                  <MessageResponse>{part.text}</MessageResponse>
                </div>
              );

            case "reasoning":
              return (
                <Reasoning
                  key={idx}
                  isStreaming={isStreaming && idx === parts.length - 1}
                >
                  <ReasoningTrigger />
                  <ReasoningContent>{part.text}</ReasoningContent>
                </Reasoning>
              );

            case "tool-call": {
              // Prefer live state if available (for duration tracking)
              const liveState = toolExecutions?.get(part.toolCallId);
              const state = liveState
                ? getToolState(liveState.phase, liveState.isError)
                : "output-available";
              const meta = formatToolMeta(part.name, part.args);

              return (
                <InlineErrorBoundary key={`call-${part.toolCallId}`} label={part.name}>
                  <Tool>
                    <ToolHeader
                      type="dynamic-tool"
                      state={state}
                      toolName={part.name}
                      title={meta || part.name}
                    />
                    <ToolContent>
                      <ToolInput input={part.args as ToolPart["input"]} />
                    </ToolContent>
                  </Tool>
                </InlineErrorBoundary>
              );
            }

            case "tool-result": {
              return (
                <InlineErrorBoundary key={`result-${part.toolCallId}`} label={part.name}>
                  <Tool>
                    <ToolHeader
                      type="dynamic-tool"
                      state={part.isError ? "output-error" : "output-available"}
                      toolName={part.name}
                      title={part.name}
                    />
                    <ToolContent>
                      <ToolOutput
                        output={part.result as ToolPart["output"]}
                        errorText={part.isError ? String(part.result) : undefined}
                      />
                    </ToolContent>
                  </Tool>
                </InlineErrorBoundary>
              );
            }

            default:
              return null;
          }
        })}

        {/* Render PENDING tools (from agent events, not yet in message.parts) */}
        {pendingTools
          .filter(([, exec]) => exec.name !== "sessions_spawn") // Subagents rendered separately
          .map(([toolCallId, exec]) => (
            <InlineErrorBoundary key={`pending-${toolCallId}`} label={exec.name}>
              <Tool>
                <ToolHeader
                  type="dynamic-tool"
                  state={getToolState(exec.phase, exec.isError)}
                  toolName={exec.name}
                  title={exec.meta || exec.name}
                />
                <ToolContent>
                  {exec.args !== undefined && <ToolInput input={exec.args as ToolPart["input"]} />}
                  {exec.result !== undefined && (
                    <ToolOutput
                      output={exec.result as ToolPart["output"]}
                      errorText={exec.isError ? String(exec.result) : undefined}
                    />
                  )}
                </ToolContent>
              </Tool>
            </InlineErrorBoundary>
          ))}

        {/* Render active subagents */}
        {subagents &&
          Array.from(subagents.values())
            .filter((s) => s.status === "spawning" || s.status === "running")
            .map((sub) => (
              <CompactErrorBoundary key={sub.toolCallId} label="Subagent">
                <SubagentCard
                  subagent={sub}
                  onViewHistory={onSubagentViewHistory ? () => onSubagentViewHistory(sub) : undefined}
                  onStop={onSubagentStop ? () => onSubagentStop(sub) : undefined}
                />
              </CompactErrorBoundary>
            ))}
      </>
    );
  }

  // Fallback: render raw content as markdown (also render any pending tools and subagents)
  return (
    <>
      <MessageResponse>{content}</MessageResponse>
      {pendingTools
        .filter(([, exec]) => exec.name !== "sessions_spawn")
        .map(([toolCallId, exec]) => (
          <InlineErrorBoundary key={`pending-${toolCallId}`} label={exec.name}>
            <Tool>
              <ToolHeader
                type="dynamic-tool"
                state={getToolState(exec.phase, exec.isError)}
                toolName={exec.name}
                title={exec.meta || exec.name}
              />
              <ToolContent>
                {exec.args !== undefined && <ToolInput input={exec.args as ToolPart["input"]} />}
                {exec.result !== undefined && (
                  <ToolOutput
                    output={exec.result as ToolPart["output"]}
                    errorText={exec.isError ? String(exec.result) : undefined}
                  />
                )}
              </ToolContent>
            </Tool>
          </InlineErrorBoundary>
        ))}
      {subagents &&
        Array.from(subagents.values())
          .filter((s) => s.status === "spawning" || s.status === "running")
          .map((sub) => (
            <CompactErrorBoundary key={sub.toolCallId} label="Subagent">
              <SubagentCard
                subagent={sub}
                onViewHistory={onSubagentViewHistory ? () => onSubagentViewHistory(sub) : undefined}
                onStop={onSubagentStop ? () => onSubagentStop(sub) : undefined}
              />
            </CompactErrorBoundary>
          ))}
    </>
  );
}
