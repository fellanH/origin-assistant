"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import { MessageParts } from "@/components/ai-elements/message-parts";
import { Loader } from "@/components/ai-elements/loader";
import {
  CopyIcon,
  RefreshCcwIcon,
  SparklesIcon,
  CheckIcon,
  XIcon,
  MenuIcon,
} from "lucide-react";
import { useGateway, useOpenClawChat, useSessionStats } from "@/lib/use-gateway";
import { loadSettings, saveSettings, createLocalSession } from "@/lib/storage";
import { SessionSidebar, type SessionSidebarHandle } from "@/components/session-sidebar";
import { ThemeDropdown } from "@/components/theme-toggle";
import { SidebarHeader } from "@/components/sidebar-header";
import { SidebarInput } from "@/components/sidebar-input";
import { useBreakpoint } from "@/hooks/use-mobile";

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
  const savedCollapsed = localStorage.getItem("cortana.sidebar.collapsed");
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
  const [sessionKey, setSessionKey] = useState(initialSettings.sessionKey);
  const [showSettings, setShowSettings] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState(initialSettings.gatewayUrl);
  const [token, setToken] = useState(initialSettings.token);
  const [copied, setCopied] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSettings.sidebarCollapsed);
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
    localStorage.setItem("cortana.sidebar.collapsed", String(sidebarCollapsed));
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
    mounted && token ? token : undefined
  );

  // Auto-open settings if connection fails (likely auth issue)
  useEffect(() => {
    if (connectionError && !showSettings) {
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
  } = useOpenClawChat(client, sessionKey, subscribe, handleMessageSent);

  // Session stats (token usage)
  const { usedTokens, maxTokens, modelId, usage } = useSessionStats(
    client,
    sessionKey,
    subscribe
  );

  // Subagent action handlers
  const handleSubagentViewHistory = useCallback((subagent: { childSessionKey?: string }) => {
    if (subagent.childSessionKey) {
      // Switch to the subagent session to view its history
      setSessionKey(subagent.childSessionKey);
    }
  }, []);

  const handleSubagentStop = useCallback((subagent: { childSessionKey?: string }) => {
    if (subagent.childSessionKey) {
      stopSubagent(subagent.childSessionKey);
    }
  }, [stopSubagent]);

  const handleSubmit = (text: string) => {
    if (!text.trim()) return;
    sendMessage(text);
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

  // Sidebar input component (only shown in sidebar on desktop)
  const sidebarFooter = !isMobile ? (
    <SidebarInput
      onSubmit={handleSubmit}
      onAbort={abort}
      canAbort={canAbort}
      connected={connected}
    />
  ) : null;

  // Mobile input component
  const mobileInput = isMobile ? (
    <div className="flex-shrink-0 border-t border-border/50 bg-card/50 backdrop-blur-xl">
      <SidebarInput
        onSubmit={handleSubmit}
        onAbort={abort}
        canAbort={canAbort}
        connected={connected}
      />
    </div>
  ) : null;

  return (
    <div className="h-screen bg-gradient-to-b from-background to-background/95 flex overflow-hidden">
      {/* Session Sidebar - Desktop: static, Tablet/Mobile: overlay */}
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
          header={sidebarHeader}
          footer={sidebarFooter}
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
          header={sidebarHeader}
          footer={sidebarFooter}
        />
      )}

      {/* Settings panel (positioned relative to sidebar) */}
      {showSettings && (
        <div className={`absolute top-16 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-5 w-80 animate-in fade-in slide-in-from-top-2 duration-200 ${isOverlayMode ? 'left-4 right-4 w-auto max-w-80' : 'left-4'}`}>
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
              <label className="text-sm font-medium text-muted-foreground">Gateway URL</label>
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
                <label className="text-sm font-medium text-muted-foreground">Token</label>
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
              <label className="text-sm font-medium text-muted-foreground">Session</label>
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
              <span className="font-semibold text-sm">Cortana</span>
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

        {/* Chat area - Full height */}
        <div className="flex-1 overflow-hidden">
          <Conversation className="h-full">
            <ConversationContent className="px-4 md:px-6 py-4 max-w-4xl mx-auto">
              {messages.length === 0 && !streamingContent && status !== "submitted" && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                    <SparklesIcon className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Hi, I&apos;m Cortana
                  </h2>
                  <p className="text-muted-foreground mt-2 max-w-sm text-sm md:text-base">
                    Your AI assistant. Ask me anything — I can help with code, answer questions, and much more.
                  </p>
                </div>
              )}

              {messages.map((message, i) => {
                const isLatestAssistant = message.role === "assistant" && i === messages.length - 1;

                return (
                  <Message key={message.id} from={message.role}>
                    <MessageContent>
                      {message.role === "assistant" ? (
                        <MessageParts
                          content={message.content}
                          parts={message.parts}
                          isStreaming={isLatestAssistant && status === "streaming"}
                          toolExecutions={isLatestAssistant ? toolExecutions : undefined}
                          subagents={isLatestAssistant ? subagents : undefined}
                          onSubagentViewHistory={handleSubagentViewHistory}
                          onSubagentStop={handleSubagentStop}
                        />
                      ) : (
                        <MessageResponse>{message.content}</MessageResponse>
                      )}
                    </MessageContent>
                    {isLatestAssistant && status === "idle" && (
                      <MessageActions>
                        <MessageAction onClick={regenerate} label="Regenerate">
                          <RefreshCcwIcon className="size-3" />
                        </MessageAction>
                        <MessageAction
                          onClick={() => handleCopy(message.content, message.id)}
                          label={copied === message.id ? "Copied!" : "Copy"}
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
                );
              })}

              {/* Streaming message */}
              {(streamingContent || toolExecutions.size > 0 || subagents.size > 0) && status === "streaming" && (
                <Message from="assistant">
                  <MessageContent>
                    <MessageParts
                      content={streamingContent}
                      isStreaming={true}
                      toolExecutions={toolExecutions}
                      subagents={subagents}
                      onSubagentViewHistory={handleSubagentViewHistory}
                      onSubagentStop={handleSubagentStop}
                    />
                  </MessageContent>
                </Message>
              )}

              {/* Loading indicator */}
              {status === "submitted" && <Loader />}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        </div>

        {/* Mobile input at bottom */}
        {mobileInput}
      </main>
    </div>
  );
}
