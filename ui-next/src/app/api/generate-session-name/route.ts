import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// In-memory caches (per-instance, cleared on restart)
// ============================================================================

/**
 * Simple hash function for cache keys.
 * Uses a combination of user message prefix + assistant message prefix.
 */
function computeCacheKey(userMessage: string, assistantMessage?: string): string {
	const userPrefix = userMessage.slice(0, 100).toLowerCase().trim();
	const assistantPrefix = (assistantMessage || "").slice(0, 100).toLowerCase().trim();
	// Simple string hash
	const combined = `${userPrefix}|${assistantPrefix}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash.toString(36);
}

type CacheEntry = {
	name: string;
	timestamp: number;
};

// Cache AI-generated names (TTL: 1 hour)
const nameCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 500;

// Rate limiting: sliding window (max 10 requests per minute)
const rateLimitWindow: number[] = [];
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function isRateLimited(): boolean {
	const now = Date.now();
	// Remove old entries outside the window
	while (rateLimitWindow.length > 0 && rateLimitWindow[0] < now - RATE_LIMIT_WINDOW_MS) {
		rateLimitWindow.shift();
	}
	return rateLimitWindow.length >= RATE_LIMIT_MAX_REQUESTS;
}

function recordRequest(): void {
	rateLimitWindow.push(Date.now());
}

function getCachedName(key: string): string | null {
	const entry = nameCache.get(key);
	if (!entry) {
		return null;
	}
	// Check TTL
	if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
		nameCache.delete(key);
		return null;
	}
	return entry.name;
}

function setCachedName(key: string, name: string): void {
	// Evict oldest entries if cache is full
	if (nameCache.size >= MAX_CACHE_SIZE) {
		const oldestKey = nameCache.keys().next().value;
		if (oldestKey) {
			nameCache.delete(oldestKey);
		}
	}
	nameCache.set(key, { name, timestamp: Date.now() });
}

/**
 * POST /api/generate-session-name
 * Generates a smart session name using Claude Sonnet based on the conversation.
 *
 * Features:
 * - In-memory cache for similar messages (1 hour TTL)
 * - Rate limiting (10 requests/minute)
 * - Graceful fallback to truncation
 */
export async function POST(request: NextRequest) {
	try {
		const { userMessage, assistantMessage } = await request.json();

		if (!userMessage) {
			return NextResponse.json(
				{ error: "Missing userMessage" },
				{ status: 400 },
			);
		}

		// Check cache first
		const cacheKey = computeCacheKey(userMessage, assistantMessage);
		const cachedName = getCachedName(cacheKey);
		if (cachedName) {
			return NextResponse.json({
				name: cachedName,
				source: "cache",
			});
		}

		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			// Fall back to simple truncation if no API key
			const fallbackName = truncateMessage(userMessage);
			setCachedName(cacheKey, fallbackName);
			return NextResponse.json({
				name: fallbackName,
				source: "fallback",
			});
		}

		// Check rate limit
		if (isRateLimited()) {
			const fallbackName = truncateMessage(userMessage);
			// Don't cache rate-limited responses (they should retry with AI later)
			return NextResponse.json({
				name: fallbackName,
				source: "rate-limited",
			});
		}

		recordRequest();
		const prompt = buildPrompt(userMessage, assistantMessage);

		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-sonnet-4-20250514",
				max_tokens: 50,
				messages: [{ role: "user", content: prompt }],
			}),
		});

		if (!response.ok) {
			console.error(
				"[generate-session-name] API error:",
				response.status,
				await response.text(),
			);
			const fallbackName = truncateMessage(userMessage);
			setCachedName(cacheKey, fallbackName);
			return NextResponse.json({
				name: fallbackName,
				source: "fallback",
			});
		}

		const data = await response.json();
		const generatedName = extractName(data);
		const finalName = generatedName || truncateMessage(userMessage);

		// Cache the result
		setCachedName(cacheKey, finalName);

		return NextResponse.json({
			name: finalName,
			source: generatedName ? "ai" : "fallback",
		});
	} catch (error) {
		console.error("[generate-session-name] Error:", error);
		return NextResponse.json(
			{ error: "Failed to generate name" },
			{ status: 500 },
		);
	}
}

function buildPrompt(userMessage: string, assistantMessage?: string): string {
	const context = assistantMessage
		? `User: ${userMessage.slice(0, 500)}\n\nAssistant: ${assistantMessage.slice(0, 500)}`
		: `User: ${userMessage.slice(0, 500)}`;

	return `Generate a very short, descriptive title (2-5 words max) for this chat session. The title should capture the main topic or intent. Return ONLY the title, nothing else. No quotes, no punctuation at the end.

${context}

Title:`;
}

function extractName(data: unknown): string | null {
	const d = data as { content?: Array<{ type: string; text?: string }> };
	if (!d.content || !Array.isArray(d.content)) {
		return null;
	}

	const textBlock = d.content.find((b) => b.type === "text");
	if (!textBlock?.text) {
		return null;
	}

	// Clean up the response
	let name = textBlock.text
		.trim()
		.replace(/^["']|["']$/g, "") // Remove surrounding quotes
		.replace(/[.!?]+$/, "") // Remove trailing punctuation
		.trim();

	// Limit length
	if (name.length > 40) {
		name = name.slice(0, 37) + "...";
	}

	return name || null;
}

function truncateMessage(message: string): string {
	const cleaned = message.replace(/\s+/g, " ").trim();
	if (cleaned.length > 35) {
		return cleaned.slice(0, 35) + "...";
	}
	return cleaned || "New Chat";
}
