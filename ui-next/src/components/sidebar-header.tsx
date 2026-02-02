"use client";

import {
	Context,
	ContextContent,
	ContextContentBody,
	ContextContentFooter,
	ContextContentHeader,
	ContextInputUsage,
	ContextOutputUsage,
	ContextTrigger,
} from "@/components/ai-elements/context";
import { cn } from "@/lib/utils";
import { SettingsIcon } from "lucide-react";
import { OriginLogo } from "./origin-logo";

type SidebarHeaderProps = {
	connected: boolean;
	connectionError: string | null;
	onSettingsClick: () => void;
	showSettings: boolean;
	// Token usage
	usedTokens?: number;
	maxTokens?: number;
	modelId?: string;
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
		cacheReadTokens?: number;
		cacheWriteTokens?: number;
		reasoningTokens?: number;
		cost?: number;
	};
};

// Convert our usage format to LanguageModelUsage format
function toLanguageModelUsage(usage?: SidebarHeaderProps["usage"]) {
	if (!usage) return undefined;
	return {
		inputTokens: usage.inputTokens ?? 0,
		outputTokens: usage.outputTokens ?? 0,
		totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
		reasoningTokens: usage.reasoningTokens,
		cachedInputTokens: usage.cacheReadTokens,
		inputTokenDetails: {
			noCacheTokens: undefined,
			cacheReadTokens: usage.cacheReadTokens,
			cacheWriteTokens: usage.cacheWriteTokens,
		},
		outputTokenDetails: {
			reasoningTokens: usage.reasoningTokens,
			textTokens: undefined,
		},
	};
}

export function SidebarHeader({
	connected,
	connectionError,
	onSettingsClick,
	showSettings,
	usedTokens = 0,
	maxTokens,
	modelId,
	usage,
}: SidebarHeaderProps) {
	return (
		<div className="px-4 py-4 border-b border-border/50">
			{/* Top row: Logo + status + actions */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="relative">
						<OriginLogo size={36} state="idle" />
						<div
							className={cn(
								"absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
								connected ? "bg-emerald-500" : "bg-red-500",
							)}
						/>
					</div>
					<div className="min-w-0">
						<h1 className="text-base font-semibold tracking-tight">Origin</h1>
						<p className="text-[10px] text-muted-foreground truncate">
							{connected
								? "Ready to help"
								: connectionError
									? "Connection failed"
									: "Connecting..."}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-0.5">
					{/* Token Usage */}
					{connected && usedTokens > 0 && maxTokens && (
						<Context
							usedTokens={usedTokens}
							maxTokens={maxTokens}
							usage={toLanguageModelUsage(usage)}
							modelId={modelId}
						>
							<ContextTrigger className="text-muted-foreground hover:text-foreground p-1.5" />
							<ContextContent side="bottom" align="start">
								<ContextContentHeader />
								<ContextContentBody className="space-y-1.5">
									<ContextInputUsage />
									<ContextOutputUsage />
								</ContextContentBody>
								<ContextContentFooter />
							</ContextContent>
						</Context>
					)}
					<button
						onClick={onSettingsClick}
						className={cn(
							"p-1.5 rounded-lg transition-all duration-200",
							showSettings
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent/50 text-muted-foreground hover:text-foreground",
						)}
					>
						<SettingsIcon className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
