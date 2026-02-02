/**
 * External Agent Scanner
 *
 * Discovers and reads state from Claude Code instances running on the local machine.
 * Parses their JSONL conversation logs to extract task and status information.
 */

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

// =============================================================================
// Types
// =============================================================================

export interface ExternalAgent {
  /** Process ID */
  pid: number;
  /** Working directory */
  cwd: string;
  /** Project name (extracted from cwd) */
  project: string;
  /** CPU usage percentage */
  cpuPercent: number;
  /** Memory usage in MB */
  memoryMb: number;
  /** Session ID (from JSONL) */
  sessionId?: string;
  /** Initial task/prompt */
  task?: string;
  /** Current status text (last assistant message) */
  statusText?: string;
  /** Current activity */
  activity: "idle" | "thinking" | "tool-use" | "unknown";
  /** Currently executing tool name */
  currentTool?: string;
  /** Session start time */
  startedAt?: Date;
  /** Last activity time */
  lastActivityAt?: Date;
  /** Total messages in conversation */
  messageCount?: number;
  /** Model being used */
  model?: string;
}

interface ClaudeProcess {
  pid: number;
  cpuPercent: number;
  memoryKb: number;
  command: string;
}

interface JsonlMessage {
  type?: string;
  message?: {
    role?: string;
    model?: string;
    content?: Array<{
      type: string;
      text?: string;
      thinking?: string;
      name?: string;
    }>;
  };
  timestamp?: string;
  cwd?: string;
  sessionId?: string;
}

// =============================================================================
// Process Discovery
// =============================================================================

/**
 * Find all running Claude Code processes
 */
function findClaudeProcesses(): ClaudeProcess[] {
  try {
    // Use ps to find claude processes
    const output = execSync(
      "ps aux | grep -E 'claude.*--dangerously-skip-permissions|claude.*--claude-in-chrome' | grep -v grep",
      { encoding: "utf-8", timeout: 5000 },
    ).trim();

    if (!output) return [];

    const processes: ClaudeProcess[] = [];
    for (const line of output.split("\n")) {
      const parts = line.split(/\s+/);
      if (parts.length < 11) continue;

      const pid = parseInt(parts[1], 10);
      const cpuPercent = parseFloat(parts[2]) || 0;
      const memoryKb = parseInt(parts[5], 10) || 0;
      const command = parts.slice(10).join(" ");

      // Skip MCP helper processes
      if (command.includes("--claude-in-chrome-mcp")) continue;

      processes.push({ pid, cpuPercent, memoryKb, command });
    }

    return processes;
  } catch {
    return [];
  }
}

/**
 * Get the working directory of a process
 */
function getProcessCwd(pid: number): string | null {
  try {
    const output = execSync(`lsof -p ${pid} 2>/dev/null | grep cwd | head -1`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();

    // Parse lsof output: "2.1.17  60737 admin  cwd  DIR  1,17  2304  34630761 /Users/admin/dev/origin"
    const parts = output.split(/\s+/);
    if (parts.length >= 9) {
      return parts.slice(8).join(" ");
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// JSONL Parsing
// =============================================================================

/**
 * Find the Claude projects directory
 */
function getClaudeProjectsDir(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * Convert a cwd path to Claude's project folder name
 */
function cwdToProjectFolder(cwd: string): string {
  // Claude uses path with slashes replaced by dashes, leading dash
  // e.g., /Users/admin/dev/origin -> -Users-admin-dev-origin
  return cwd.replace(/\//g, "-");
}

/**
 * Find the most recent JSONL session file for a project
 */
function findLatestSessionFile(projectFolder: string): string | null {
  const projectsDir = getClaudeProjectsDir();
  const projectPath = join(projectsDir, projectFolder);

  if (!existsSync(projectPath)) return null;

  try {
    const files = readdirSync(projectPath)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({
        name: f,
        path: join(projectPath, f),
        mtime: statSync(join(projectPath, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    return files[0]?.path ?? null;
  } catch {
    return null;
  }
}

/**
 * Parse a JSONL file and extract relevant information
 */
function parseSessionJsonl(filePath: string): {
  sessionId?: string;
  task?: string;
  statusText?: string;
  activity: "idle" | "thinking" | "tool-use" | "unknown";
  currentTool?: string;
  startedAt?: Date;
  lastActivityAt?: Date;
  messageCount: number;
  model?: string;
} {
  const result = {
    activity: "unknown" as const,
    messageCount: 0,
  };

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");

    let firstUserMessage: string | undefined;
    let lastAssistantText: string | undefined;
    let lastTimestamp: string | undefined;
    let firstTimestamp: string | undefined;
    let model: string | undefined;
    let sessionId: string | undefined;
    let lastMessageType: string | undefined;
    let lastToolName: string | undefined;

    // Process lines (read last N for efficiency on large files)
    const linesToProcess =
      lines.length > 100 ? [...lines.slice(0, 10), ...lines.slice(-50)] : lines;

    for (const line of linesToProcess) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as JsonlMessage;

        // Track session ID
        if (entry.sessionId && !sessionId) {
          sessionId = entry.sessionId;
        }

        // Track timestamps
        if (entry.timestamp) {
          if (!firstTimestamp) firstTimestamp = entry.timestamp;
          lastTimestamp = entry.timestamp;
        }

        // Track message types
        if (entry.type) {
          lastMessageType = entry.type;
        }

        // Extract from messages
        if (entry.message) {
          result.messageCount++;

          // Track model
          if (entry.message.model && !model) {
            model = entry.message.model;
          }

          // First user message = task
          if (entry.message.role === "user" && !firstUserMessage) {
            const textBlock = entry.message.content?.find((b) => b.type === "text");
            if (textBlock?.text) {
              firstUserMessage = textBlock.text;
            }
          }

          // Last assistant message = status
          if (entry.message.role === "assistant") {
            const textBlock = entry.message.content?.find((b) => b.type === "text");
            if (textBlock?.text) {
              lastAssistantText = textBlock.text;
            }

            // Check for tool use
            const toolBlock = entry.message.content?.find((b) => b.type === "tool_use");
            if (toolBlock?.name) {
              lastToolName = toolBlock.name;
            }

            // Check for thinking
            const thinkingBlock = entry.message.content?.find((b) => b.type === "thinking");
            if (thinkingBlock) {
              lastMessageType = "thinking";
            }
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Determine activity based on last entries
    let activity: "idle" | "thinking" | "tool-use" | "unknown" = "unknown";
    if (lastMessageType === "thinking") {
      activity = "thinking";
    } else if (lastToolName && lastMessageType !== "assistant") {
      activity = "tool-use";
    } else if (lastMessageType === "assistant" || lastMessageType === "user") {
      activity = "idle";
    }

    return {
      sessionId,
      task: firstUserMessage?.slice(0, 200),
      statusText: lastAssistantText?.slice(0, 300),
      activity,
      currentTool: activity === "tool-use" ? lastToolName : undefined,
      startedAt: firstTimestamp ? new Date(firstTimestamp) : undefined,
      lastActivityAt: lastTimestamp ? new Date(lastTimestamp) : undefined,
      messageCount: result.messageCount,
      model,
    };
  } catch {
    return { activity: "unknown", messageCount: 0 };
  }
}

// =============================================================================
// Main Scanner
// =============================================================================

/**
 * Scan for all external Claude agents and return their state
 */
export function scanExternalAgents(): ExternalAgent[] {
  const processes = findClaudeProcesses();
  const agents: ExternalAgent[] = [];

  for (const proc of processes) {
    const cwd = getProcessCwd(proc.pid);
    if (!cwd) continue;

    const projectFolder = cwdToProjectFolder(cwd);
    const sessionFile = findLatestSessionFile(projectFolder);

    const sessionData = sessionFile
      ? parseSessionJsonl(sessionFile)
      : { activity: "unknown" as const, messageCount: 0 };

    agents.push({
      pid: proc.pid,
      cwd,
      project: basename(cwd),
      cpuPercent: proc.cpuPercent,
      memoryMb: Math.round(proc.memoryKb / 1024),
      sessionId: sessionData.sessionId,
      task: sessionData.task,
      statusText: sessionData.statusText,
      activity: sessionData.activity,
      currentTool: sessionData.currentTool,
      startedAt: sessionData.startedAt,
      lastActivityAt: sessionData.lastActivityAt,
      messageCount: sessionData.messageCount,
      model: sessionData.model,
    });
  }

  // Sort by CPU usage (most active first)
  agents.sort((a, b) => b.cpuPercent - a.cpuPercent);

  return agents;
}

/**
 * Get a summary of external agents (lighter version for polling)
 */
export function getExternalAgentsSummary(): {
  count: number;
  active: number;
  agents: Array<{
    pid: number;
    project: string;
    activity: string;
    cpuPercent: number;
  }>;
} {
  const agents = scanExternalAgents();
  return {
    count: agents.length,
    active: agents.filter((a) => a.cpuPercent > 5).length,
    agents: agents.map((a) => ({
      pid: a.pid,
      project: a.project,
      activity: a.activity,
      cpuPercent: a.cpuPercent,
    })),
  };
}
