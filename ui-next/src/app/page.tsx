"use client";

import { ChatContent } from "@/components/chat-content";
import { ChatProvider, useChatContext } from "@/components/chat-provider";
import {
	CompactErrorBoundary,
	ErrorBoundary,
} from "@/components/error-boundary";
import { FaviconUpdater } from "@/components/favicon-updater";
import { MobileHeader } from "@/components/mobile-header";
import {
	SessionSidebar,
	type SessionSidebarHandle,
} from "@/components/session-sidebar";
import { SettingsPanel } from "@/components/settings-panel";
import { SidebarHeader } from "@/components/sidebar-header";
import { useBreakpoint } from "@/hooks/use-mobile";
import { useSessionField } from "@/lib/session-store";
import type { SubagentMeta } from "@/lib/session-utils";
import { createLocalSession, loadSettings, saveSettings } from "@/lib/storage";
import { useGateway, useSessionStats } from "@/lib/use-gateway";
import {
	useSessionStoreSubscription,
	useSubagentPersistence,
	useToolExecutionCleanup,
} from "@/lib/use-session";
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

// Favicon component that uses ChatContext for status
function FaviconWithContext() {
	const { status } = useChatContext();
	return <FaviconUpdater status={status} />;
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
	const [showSendPulse, setShowSendPulse] = useState(false);
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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
		setMounted(true);
	}, []);

	// Close mobile sidebar when switching to desktop
	useEffect(() => {
		if (!isOverlayMode && mobileSidebarOpen) {
			setMobileSidebarOpen(false);
		}
	}, [isOverlayMode, mobileSidebarOpen]);

	// Listen for session navigation events from ChatContent
	useEffect(() => {
		const handleNavigate = (e: CustomEvent<{ sessionKey: string }>) => {
			setSessionKey(e.detail.sessionKey);
		};
		window.addEventListener(
			"session-navigate",
			handleNavigate as EventListener,
		);
		return () => {
			window.removeEventListener(
				"session-navigate",
				handleNavigate as EventListener,
			);
		};
	}, []);

	// Callback to refresh sidebar when messages are sent/received
	const handleMessageSent = useCallback(() => {
		sidebarRef.current?.refresh();
	}, []);

	// Save settings when they change (skip first render)
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
		const newKey = `agent:main:${Date.now().toString(36)}`;
		createLocalSession(newKey);
		setSessionKey(newKey);
		sidebarRef.current?.refresh();
	};

	// Connect to gateway
	const { client, connected, subscribe, connectionError } = useGateway(
		mounted ? gatewayUrl : "",
		mounted && token ? token : undefined,
	);

	// Auto-open settings if connection fails
	useEffect(() => {
		if (connectionError && !showSettings) {
			setShowSettings(true);
		}
	}, [connectionError, showSettings]);

	// Initialize session store WebSocket subscription
	useSessionStoreSubscription(subscribe);

	// Session stats (token usage)
	const { usedTokens, maxTokens, modelId, usage } = useSessionStats(
		client,
		sessionKey,
		subscribe,
	);

	// Cleanup hooks
	useToolExecutionCleanup(sessionKey);
	useSubagentPersistence(sessionKey);

	// Get subagents from store for sidebar metadata
	const subagents = useSessionField(sessionKey, (s) => s.subagents);

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

	// Sidebar header
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
			{/* Session Sidebar */}
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

			{/* Settings panel */}
			{showSettings && (
				<CompactErrorBoundary label="Settings">
					<SettingsPanel
						gatewayUrl={gatewayUrl}
						onGatewayUrlChange={setGatewayUrl}
						token={token}
						onTokenChange={setToken}
						sessionKey={sessionKey}
						onSessionKeyChange={setSessionKey}
						onClose={() => setShowSettings(false)}
						isOverlay={isOverlayMode}
					/>
				</CompactErrorBoundary>
			)}

			{/* Main Content */}
			<main className="flex-1 flex flex-col h-full overflow-hidden">
				{/* Mobile header */}
				{isOverlayMode && (
					<MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
				)}

				{/* Chat content wrapped in ChatProvider */}
				<ChatProvider
					client={client}
					sessionKey={sessionKey}
					onMessageSent={handleMessageSent}
				>
					<FaviconWithContext />
					<ChatContent
						connected={connected}
						connectionError={connectionError}
						input={input}
						setInput={setInput}
						mounted={mounted}
						copied={copied}
						setCopied={setCopied}
						showSendPulse={showSendPulse}
						setShowSendPulse={setShowSendPulse}
					/>
				</ChatProvider>
			</main>
		</div>
	);
}
