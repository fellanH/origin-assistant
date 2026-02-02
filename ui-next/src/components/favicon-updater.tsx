"use client";

import type { ChatStatus } from "@/lib/use-session";
import { useEffect } from "react";

/**
 * Maps chat status to favicon variant so the tab reflects activity.
 * - submitted -> thinking (amber)
 * - streaming -> speaking (emerald)
 * - idle / error -> default (blue)
 */
function faviconForStatus(status: ChatStatus): string {
	switch (status) {
		case "submitted":
			return "/favicon-thinking.svg";
		case "streaming":
			return "/favicon-speaking.svg";
		default:
			return "/favicon.svg";
	}
}

export function FaviconUpdater({ status }: { status: ChatStatus }) {
	useEffect(() => {
		const link = document.querySelector(
			'link[rel="icon"]',
		) as HTMLLinkElement | null;
		if (!link) return;
		const href = faviconForStatus(status);
		if (link.getAttribute("href") !== href) {
			link.setAttribute("href", href);
		}
	}, [status]);

	return null;
}
