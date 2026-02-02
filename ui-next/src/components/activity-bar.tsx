"use client";

import type {
	ChatStatus,
	SubagentState,
	ToolExecutionState,
} from "@/lib/use-gateway";
import { Loader } from "@/components/ai-elements/loader";
import { BotIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type ActivityBarProps = {
	status: ChatStatus;
	toolExecutions: Map<string, ToolExecutionState>;
	subagents: Map<string, SubagentState>;
};

export function ActivityBar({
	status,
	toolExecutions,
	subagents,
}: ActivityBarProps) {
	// Only show for tools and subagents - streaming text is already visible feedback
	const activeTools = Array.from(toolExecutions.values()).filter(
		(t) => t.phase === "executing",
	);
	const activeSubagents = Array.from(subagents.values()).filter(
		(s) => s.status === "running" || s.status === "spawning",
	);

	const isActive = activeTools.length > 0 || activeSubagents.length > 0;

	return (
		<AnimatePresence>
			{isActive && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.2, ease: "easeInOut" }}
					className="overflow-hidden flex-shrink-0"
				>
					<div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-sm text-muted-foreground border-b border-border/50">
						{activeTools.length > 0 && (
							<>
								<Loader size={14} className="text-yellow-500" />
								<span>Running: {activeTools.map((t) => t.name).join(", ")}</span>
							</>
						)}
						{activeSubagents.length > 0 && (
							<>
								{activeTools.length > 0 && (
									<span className="ml-2 text-border">•</span>
								)}
								<BotIcon className="w-4 h-4 text-blue-500" />
								<span>
									{activeSubagents.length} subagent
									{activeSubagents.length > 1 ? "s" : ""} running
								</span>
							</>
						)}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
