"use client";

import { ActivityBar } from "@/components/activity-bar";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { ChatMessageList } from "@/components/chat-message-list";
import { useChatContext } from "@/components/chat-provider";
import { SectionErrorBoundary } from "@/components/error-boundary";
import { SessionScrollHandler } from "@/components/session-scroll-handler";
import { AlertCircleIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";

interface ChatContentProps {
	connected: boolean;
	connectionError: string | null;
	input: string;
	setInput: (value: string) => void;
	mounted: boolean;
	copied: string | null;
	setCopied: (id: string | null) => void;
	showSendPulse: boolean;
	setShowSendPulse: (show: boolean) => void;
}

export function ChatContent({
	connected,
	connectionError,
	input,
	setInput,
	mounted,
	copied,
	setCopied,
	showSendPulse,
	setShowSendPulse,
}: ChatContentProps) {
	const {
		sessionKey,
		status,
		error,
		queueLength,
		canAbort,
		sendMessage,
		abort,
		regenerate,
		stopSubagent,
		subagents,
		toolExecutions,
	} = useChatContext();

	const handleSubmit = (message: PromptInputMessage) => {
		if (!message.text?.trim()) return;
		sendMessage(message.text);
		setInput("");
		setShowSendPulse(true);
		setTimeout(() => setShowSendPulse(false), 400);
	};

	const handleCopy = (content: string, id: string) => {
		navigator.clipboard.writeText(content);
		setCopied(id);
		setTimeout(() => setCopied(null), 2000);
	};

	// Subagent action handlers - dispatch events for parent to handle session navigation
	const handleSubagentViewHistory = useCallback(
		(subagent: { childSessionKey?: string }) => {
			if (subagent.childSessionKey) {
				window.dispatchEvent(
					new CustomEvent("session-navigate", {
						detail: { sessionKey: subagent.childSessionKey },
					}),
				);
			}
		},
		[],
	);

	const handleSubagentNavigateToSession = useCallback((sessionKey: string) => {
		window.dispatchEvent(
			new CustomEvent("session-navigate", { detail: { sessionKey } }),
		);
	}, []);

	const handleSubagentStop = useCallback(
		(subagent: { childSessionKey?: string }) => {
			if (subagent.childSessionKey) {
				stopSubagent(subagent.childSessionKey);
			}
		},
		[stopSubagent],
	);

	return (
		<>
			{/* Error banner */}
			{(error || connectionError) && (
				<div className="mx-4 md:mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-center gap-3 flex-shrink-0">
					<div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
						<XIcon className="w-4 h-4" />
					</div>
					<div className="flex-1">
						<span>{connectionError || error}</span>
						{connectionError && (
							<p className="text-xs mt-1 opacity-70">
								Check your gateway URL and token in settings.
							</p>
						)}
					</div>
				</div>
			)}

			{/* Activity status bar */}
			<ActivityBar
				status={status}
				toolExecutions={toolExecutions}
				subagents={subagents}
			/>

			{/* Chat area */}
			<div className="flex-1 flex flex-col px-4 md:px-6 py-4 overflow-hidden max-w-4xl mx-auto w-full">
				<Conversation className="flex-1">
					<SessionScrollHandler sessionKey={sessionKey} />
					<SectionErrorBoundary label="Chat">
						<ConversationContent>
							<ChatMessageList
								onCopy={handleCopy}
								onRegenerate={regenerate}
								copiedId={copied}
								onSuggestionClick={setInput}
								onSubagentViewHistory={handleSubagentViewHistory}
								onSubagentStop={handleSubagentStop}
								onSubagentNavigateToSession={handleSubagentNavigateToSession}
							/>
						</ConversationContent>
					</SectionErrorBoundary>
					<ConversationScrollButton />
				</Conversation>

				{/* Input */}
				<div className="pt-4 flex-shrink-0">
					<AnimatePresence>
						{!connected && mounted && (
							<motion.div
								initial={{ opacity: 0, height: 0, marginBottom: 0 }}
								animate={{ opacity: 1, height: "auto", marginBottom: 8 }}
								exit={{ opacity: 0, height: 0, marginBottom: 0 }}
								transition={{ duration: 0.2 }}
								className="overflow-hidden"
							>
								<div className="text-xs text-destructive flex items-center justify-center gap-1.5 py-2 px-3 bg-destructive/10 rounded-xl border border-destructive/20 animate-connection-pulse">
									<AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
									<span>Disconnected — reconnecting...</span>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
					<PromptInput
						onSubmit={handleSubmit}
						className={`border border-border/50 rounded-2xl bg-card/50 backdrop-blur-sm shadow-lg transition-shadow ${showSendPulse ? "animate-send-pulse" : ""}`}
					>
						<PromptInputBody>
							<PromptInputTextarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder={
									connected
										? queueLength > 0
											? `Message queued... (${queueLength} waiting)`
											: canAbort
												? "Type to queue another message..."
												: "Message Origin..."
										: "Connecting..."
								}
								disabled={!connected}
								className="min-h-[52px]"
							/>
						</PromptInputBody>
						<PromptInputFooter>
							<PromptInputTools />
							<PromptInputSubmit
								disabled={!connected || !input.trim()}
								status={
									status === "streaming"
										? "streaming"
										: status === "submitted"
											? "submitted"
											: undefined
								}
								onStop={abort}
							/>
						</PromptInputFooter>
					</PromptInput>
					<p className="text-center text-xs text-muted-foreground/50 mt-3">
						Origin can make mistakes. Consider checking important information.
					</p>
				</div>
			</div>
		</>
	);
}
