import { NextResponse } from "next/server";

/**
 * GET /api/external-agents
 * Returns a list of external Claude Code agents running on the system.
 * Currently returns an empty array as this feature is not yet implemented.
 */
export async function GET() {
	return NextResponse.json({ agents: [] });
}
