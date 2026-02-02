"use client";

import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import { MessageParts } from "@/components/ai-elements/message-parts";
import { ConversationSkeleton } from "@/components/ai-elements/message-skeleton";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { EmptyState } from "@/components/empty-state";
import { ActivityBar } from "@/components/activity-bar";
import {
	CompactErrorBoundary,
	ErrorBoundary,
	SectionErrorBoundary,
} from "@/components/error-boundary";
import {
	SessionSidebar,
	type SessionSidebarHandle,
} from "@/components/session-sidebar";
import { SidebarHeader } from "@/components/sidebar-header";
import { ThemeDropdown } from "@/components/theme-toggle";
import { useBreakpoint } from "@/hooks/use-mobile";
import type { SubagentMeta } from "@/lib/session-utils";
import { createLocalSession, loadSettings, saveSettings } from "@/lib/storage";
import {
	useGateway,
	useOpenClawChat,
	useSessionStats,
} from "@/lib/use-gateway";
import {
	AlertCircleIcon,
	CheckIcon,
	CopyIcon,
	MenuIcon,
	RefreshCcwIcon,
	SparklesIcon,
	XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Helper to get initial settings synchronously (safe for SSR)
function getInitialSettings() {
	if (typeof window === "undefined") {
		return {
			gatewayUrl: "ws://127.0.0.1:18789",
			token: "",
			sessionKey: "agent:main:main",
			sidebarCollapsed: false,
		};
	}
	const loaded = loadSettings();
	const savedCollapsed = localStorage.getItem("origin.sidebar.collapsed");
	return {
		gatewayUrl: loaded.gatewayUrl,
		token: loaded.token,
		sessionKey: loaded.sessionKey,
		sidebarCollapsed: savedCollapsed === "true",
	};
}

export default function ChatPage() {
	// Initialize from storage synchronously during first render
	const [initialSettings] = useState(getInitialSettings);
	const [input, setInput] = useState("");
	const [sessionKey, setSessionKey] = useState(initialSettings.sessionKey);
	const [showSettings, setShowSettings] = useState(false);
	const [gatewayUrl, setGatewayUrl] = useState(initialSettings.gatewayUrl);
	const [token, setToken] = useState(initialSettings.token);
	const [copied, setCopied] = useState<string | null>(null);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(
		initialSettings.sidebarCollapsed,
	);
	// Track send pulse animation for input feedback
	const [showSendPulse, setShowSendPulse] = useState(false);
	// Mobile sidebar state (separate from collapsed for overlay mode)
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
	// Track if we've mounted (for SSR hydration safety)
	const [mounted, setMounted] = useState(false);

	// Responsive breakpoint
	const breakpoint = useBreakpoint();
	const isMobile = breakpoint === "mobile";
	const isTablet = breakpoint === "tablet";
	const isOverlayMode = isMobile || isTablet;

	// Ref for sidebar to trigger refresh
	const sidebarRef = useRef<SessionSidebarHandle>(null);

	// Mark as mounted after hydration
	useEffect(() => {
		// One-time initialization after hydration - safe to set state here
		setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
	}, []);

	// Close mobile sidebar when switching to desktop
	useEffect(() => {
		if (!isOverlayMode && mobileSidebarOpen) {
			setMobileSidebarOpen(false);
		}
	}, [isOverlayMode, mobileSidebarOpen]);

	// Callback to refresh sidebar when messages are sent/received
	const handleMessageSent = useCallback(() => {
		sidebarRef.current?.refresh();
	}, []);

	// Save settings when they change (skip first render to avoid overwriting with defaults)
	const isFirstRender = useRef(true);
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		saveSettings({ gatewayUrl, token, sessionKey });
	}, [gatewayUrl, token, sessionKey]);

	// Save sidebar state
	useEffect(() => {
		localStorage.setItem("origin.sidebar.collapsed", String(sidebarCollapsed));
	}, [sidebarCollapsed]);

	const handleSessionChange = (newSessionKey: string) => {
		setSessionKey(newSessionKey);
	};

	const handleNewSession = () => {
		// Generate a new session key
		const newKey = `agent:main:${Date.now().toString(36)}`;
		// Create a local session entry
		createLocalSession(newKey);
		setSessionKey(newKey);
		// Refresh sidebar to show the new session
		sidebarRef.current?.refresh();
	};

	// Connect to gateway (only after mounted to avoid SSR issues)
	const { client, connected, subscribe, connectionError } = useGateway(
		mounted ? gatewayUrl : "",
		mounted && token ? token : undefined,
	);

	// Auto-open settings if connection fails (likely auth issue)
	useEffect(() => {
		if (connectionError && !showSettings) {
			// Intentionally open settings panel to help user fix connection issues
			setShowSettings(true); // eslint-disable-line react-hooks/set-state-in-effect
		}
	}, [connectionError, showSettings]);

	// Chat state
	const {
		messages,
		status,
		streamingContent,
		error,
		toolExecutions,
		subagents,
		sendMessage,
		abort,
		regenerate,
		stopSubagent,
		canAbort,
		historyLoading,
		messageQueue,
		queueLength,
	} = useOpenClawChat(client, sessionKey, subscribe, handleMessageSent);

	// Session stats (token usage)
	const { usedTokens, maxTokens, modelId, usage } = useSessionStats(
		client,
		sessionKey,
		subscribe,
	);

	// Derive subagentMeta for sidebar tree (keyed by childSessionKey)
	const subagentMeta = useMemo(() => {
		const meta = new Map<string, SubagentMeta>();
		for (const [, subagent] of subagents) {
			if (subagent.childSessionKey) {
				meta.set(subagent.childSessionKey, {
					label: subagent.label,
					status: subagent.status,
					duration: subagent.completedAt
						? subagent.completedAt - subagent.startedAt
						: Date.now() - subagent.startedAt,
					model: subagent.model,
					parentSessionKey: subagent.parentSessionKey,
				});
			}
		}
		return meta;
	}, [subagents]);

	// Subagent action handlers
	const handleSubagentViewHistory = useCallback(
		(subagent: { childSessionKey?: string }) => {
			if (subagent.childSessionKey) {
				// Switch to the subagent session to view its history
				setSessionKey(subagent.childSessionKey);
			}
		},
		[],
	);

	const handleSubagentNavigateToSession = useCallback(
		(sessionKey: string) => {
			setSessionKey(sessionKey);
		},
		[],
	);

	const handleSubagentStop = useCallback(
		(subagent: { childSessionKey?: string }) => {
			if (subagent.childSessionKey) {
				stopSubagent(subagent.childSessionKey);
			}
		},
		[stopSubagent],
	);

	const handleSubmit = (message: PromptInputMessage) => {
		if (!message.text?.trim()) return;
		sendMessage(message.text);
		setInput("");
		// Trigger send pulse animation
		setShowSendPulse(true);
		setTimeout(() => setShowSendPulse(false), 400);
	};

	const handleCopy = (content: string, id: string) => {
		navigator.clipboard.writeText(content);
		setCopied(id);
		setTimeout(() => setCopied(null), 2000);
	};

	// Sidebar header component
	const sidebarHeader = (
		<SidebarHeader
			connected={connected}
			connectionError={connectionError}
			onSettingsClick={() => setShowSettings(!showSettings)}
			showSettings={showSettings}
			usedTokens={usedTokens}
			maxTokens={maxTokens}
			modelId={modelId ?? undefined}
			usage={usage}
		/>
	);

	return (
		<div className="h-screen bg-gradient-to-b from-background to-background/95 flex overflow-hidden">
			{/* Session Sidebar - Desktop: static, Tablet/Mobile: overlay */}
			<ErrorBoundary label="Sidebar" size="compact">
				{isOverlayMode ? (
					<SessionSidebar
						ref={sidebarRef}
						client={client}
						connected={connected}
						currentSessionKey={sessionKey}
						collapsed={!mobileSidebarOpen}
						onSessionSelect={handleSessionChange}
						onToggleCollapsed={() => setMobileSidebarOpen(!mobileSidebarOpen)}
						onNewSession={handleNewSession}
						subagentMeta={subagentMeta}
						header={sidebarHeader}
						isOverlay={true}
						onClose={() => setMobileSidebarOpen(false)}
					/>
				) : (
					<SessionSidebar
						ref={sidebarRef}
						client={client}
						connected={connected}
						currentSessionKey={sessionKey}
						collapsed={sidebarCollapsed}
						onSessionSelect={handleSessionChange}
						onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
						onNewSession={handleNewSession}
						subagentMeta={subagentMeta}
						header={sidebarHeader}
					/>
				)}
			</ErrorBoundary>

			{/* Settings panel (positioned relative to sidebar) */}
			{showSettings && (
				<CompactErrorBoundary label="Settings">
					<div
						className={`absolute top-16 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-5 w-80 animate-in fade-in slide-in-from-top-2 duration-200 ${isOverlayMode ? "left-4 right-4 w-auto max-w-80" : "left-4"}`}
					>
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-semibold">Settings</h3>
							<button
								onClick={() => setShowSettings(false)}
								className="p-1 rounded-lg hover:bg-accent/50 text-muted-foreground"
							>
								<XIcon className="w-4 h-4" />
							</button>
						</div>
						<div className="space-y-4">
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Gateway URL
								</label>
								<input
									type="text"
									value={gatewayUrl}
									onChange={(e) => setGatewayUrl(e.target.value)}
									className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
									placeholder="ws://localhost:18789"
								/>
							</div>
							<div>
								<div className="flex items-center justify-between">
									<label className="text-sm font-medium text-muted-foreground">
										Token
									</label>
									{token && (
										<span className="text-xs text-emerald-500 flex items-center gap-1">
											<CheckIcon className="w-3 h-3" />
											Detected
										</span>
									)}
								</div>
								<input
									type="password"
									value={token}
									onChange={(e) => setToken(e.target.value)}
									className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
									placeholder={token ? "••••••••" : "Optional"}
								/>
							</div>
							<div>
								<label className="text-sm font-medium text-muted-foreground">
									Session
								</label>
								<input
									type="text"
									value={sessionKey}
									onChange={(e) => setSessionKey(e.target.value)}
									className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
									placeholder="agent:main:main"
								/>
							</div>
							<ThemeDropdown />
						</div>
					</div>
				</CompactErrorBoundary>
			)}

			{/* Main Content - Full Height Conversation */}
			<main className="flex-1 flex flex-col h-full overflow-hidden">
				{/* Mobile header with hamburger menu */}
				{isOverlayMode && (
					<div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50 backdrop-blur-xl flex-shrink-0">
						<button
							onClick={() => setMobileSidebarOpen(true)}
							className="p-2 -ml-2 rounded-xl hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
							title="Open menu"
						>
							<MenuIcon className="w-5 h-5" />
						</button>
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
								<SparklesIcon className="w-4 h-4 text-white" />
							</div>
							<span className="font-semibold text-sm">Origin</span>
						</div>
						<div className="w-9" /> {/* Spacer for centering */}
					</div>
				)}

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
						<SectionErrorBoundary label="Chat">
							<ConversationContent>
								{/* Loading skeleton while fetching history */}
								<AnimatePresence mode="wait">
									{historyLoading && messages.length === 0 && (
										<ConversationSkeleton key="skeleton" messageCount={2} />
									)}

									{/* Empty state - only show if not loading and no messages */}
									{!historyLoading &&
										messages.length === 0 &&
										!streamingContent &&
										status !== "submitted" && (
											<motion.div
												key="empty"
												initial={{ opacity: 0, y: 20 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0, y: -10 }}
												transition={{ duration: 0.3 }}
											>
												<EmptyState onSuggestionClick={setInput} />
											</motion.div>
										)}
								</AnimatePresence>

								{/* Message list with smooth transitions */}
								<AnimatePresence initial={false}>
									{messages.map((message, i) => {
										const isLatestAssistant =
											message.role === "assistant" && i === messages.length - 1;

										return (
											<motion.div
												key={message.id}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.2 }}
											>
												<CompactErrorBoundary label="Message">
													<Message from={message.role}>
														<MessageContent>
															{message.role === "assistant" ? (
																<MessageParts
																	content={message.content}
																	parts={message.parts}
																	isStreaming={
																		isLatestAssistant && status === "streaming"
																	}
																	toolExecutions={
																		isLatestAssistant
																			? toolExecutions
																			: undefined
																	}
																	subagents={
																		isLatestAssistant ? subagents : undefined
																	}
																	onSubagentViewHistory={
																		handleSubagentViewHistory
																	}
																	onSubagentStop={handleSubagentStop}
																	onSubagentNavigateToSession={
																		handleSubagentNavigateToSession
																	}
																/>
															) : (
																<MessageResponse>
																	{message.content}
																</MessageResponse>
															)}
														</MessageContent>
														{isLatestAssistant && status === "idle" && (
															<MessageActions>
																<MessageAction
																	onClick={regenerate}
																	label="Regenerate"
																>
																	<RefreshCcwIcon className="size-3" />
																</MessageAction>
																<MessageAction
																	onClick={() =>
																		handleCopy(message.content, message.id)
																	}
																	label={
																		copied === message.id ? "Copied!" : "Copy"
																	}
																>
																	{copied === message.id ? (
																		<CheckIcon className="size-3 text-emerald-500" />
																	) : (
																		<CopyIcon className="size-3" />
																	)}
																</MessageAction>
															</MessageActions>
														)}
													</Message>
												</CompactErrorBoundary>
											</motion.div>
										);
									})}
								</AnimatePresence>

								{/* Streaming message / Active subagents */}
								<AnimatePresence>
									{((streamingContent ||
										toolExecutions.size > 0) &&
										status === "streaming") ||
										(subagents.size > 0 && 
										 Array.from(subagents.values()).some(s => s.status === "spawning" || s.status === "running")) && (
											<motion.div
												key="streaming"
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.15 }}
											>
												<CompactErrorBoundary label="Streaming message">
													<Message from="assistant">
														<MessageContent>
															<MessageParts
																content={streamingContent}
																isStreaming={true}
																toolExecutions={toolExecutions}
																subagents={subagents}
																onSubagentViewHistory={
																	handleSubagentViewHistory
																}
																onSubagentStop={handleSubagentStop}
																onSubagentNavigateToSession={
																	handleSubagentNavigateToSession
																}
															/>
														</MessageContent>
													</Message>
												</CompactErrorBoundary>
											</motion.div>
										)}
								</AnimatePresence>

								{/* Thinking indicator - shows while waiting for first response */}
								<AnimatePresence>
									{status === "submitted" && (
										<Loader
											key="thinking"
											variant="thinking"
											label="Thinking"
										/>
									)}
								</AnimatePresence>

								{/* Queued messages - show pending messages while processing */}
								<AnimatePresence>
									{messageQueue.map((text, i) => (
										<motion.div
											key={`queued-${i}`}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
										>
											<Message from="user">
												<MessageContent>
													<div className="opacity-50 italic">
														<MessageResponse>{text}</MessageResponse>
														<span className="text-xs text-muted-foreground ml-2">
															Queued
														</span>
													</div>
												</MessageContent>
											</Message>
										</motion.div>
									))}
								</AnimatePresence>
							</ConversationContent>
						</SectionErrorBoundary>
						<ConversationScrollButton />
					</Conversation>

					{/* Input - centered in main area */}
					<div className="pt-4 flex-shrink-0">
						{/* Connection status warning */}
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
			</main>
		</div>
	);
}
