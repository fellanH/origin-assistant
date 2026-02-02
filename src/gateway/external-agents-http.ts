/**
 * HTTP handler for external agent discovery endpoint
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { scanExternalAgents, getExternalAgentsSummary } from "./external-agents.js";

const EXTERNAL_AGENTS_PATH = "/api/external-agents";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.end(JSON.stringify(body));
}

/**
 * Handle external agents API requests
 *
 * GET /api/external-agents - Full agent details
 * GET /api/external-agents/summary - Lightweight summary for polling
 */
export function handleExternalAgentsHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const url = new URL(req.url ?? "/", `http://localhost`);

  // Handle CORS preflight
  if (req.method === "OPTIONS" && url.pathname.startsWith(EXTERNAL_AGENTS_PATH)) {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.end();
    return true;
  }

  // GET /api/external-agents
  if (req.method === "GET" && url.pathname === EXTERNAL_AGENTS_PATH) {
    try {
      const agents = scanExternalAgents();
      sendJson(res, 200, { agents });
    } catch (err) {
      sendJson(res, 500, {
        error: "Failed to scan external agents",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return true;
  }

  // GET /api/external-agents/summary
  if (req.method === "GET" && url.pathname === `${EXTERNAL_AGENTS_PATH}/summary`) {
    try {
      const summary = getExternalAgentsSummary();
      sendJson(res, 200, summary);
    } catch (err) {
      sendJson(res, 500, {
        error: "Failed to get agent summary",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return true;
  }

  return false;
}
