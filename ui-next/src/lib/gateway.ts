/**
 * OpenClaw Gateway Client for React
 * Connects to the OpenClaw WebSocket gateway and handles chat messaging.
 */

export type GatewayEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
};

export type GatewayResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
};

export type GatewayHelloOk = {
  type: "hello-ok";
  protocol: number;
  features?: { methods?: string[]; events?: string[] };
  snapshot?: unknown;
};

type Pending = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
};

export type GatewayClientOptions = {
  url: string;
  token?: string;
  password?: string;
  sessionKey?: string;
  onHello?: (hello: GatewayHelloOk) => void;
  onEvent?: (evt: GatewayEventFrame) => void;
  onClose?: (info: { code: number; reason: string }) => void;
  onReconnect?: () => void;
  onConnectError?: (error: string) => void;
};

function generateUUID(): string {
  return crypto.randomUUID?.() ?? 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export class GatewayClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, Pending>();
  private closed = false;
  private backoffMs = 800;
  private connectSent = false;

  constructor(private opts: GatewayClientOptions) {}

  start() {
    this.closed = false;
    this.connect();
  }

  stop() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
    this.flushPending(new Error("gateway client stopped"));
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect() {
    if (this.closed) return;
    this.ws = new WebSocket(this.opts.url);
    this.ws.onopen = () => this.sendConnect();
    this.ws.onmessage = (ev) => this.handleMessage(String(ev.data ?? ""));
    this.ws.onclose = (ev) => {
      this.ws = null;
      this.connectSent = false;
      this.flushPending(new Error(`gateway closed (${ev.code})`));
      this.opts.onClose?.({ code: ev.code, reason: ev.reason });
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {};
  }

  private scheduleReconnect() {
    if (this.closed) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 1.7, 15_000);
    setTimeout(() => {
      this.opts.onReconnect?.();
      this.connect();
    }, delay);
  }

  private flushPending(err: Error) {
    for (const [, p] of this.pending) p.reject(err);
    this.pending.clear();
  }

  private sendConnect() {
    if (this.connectSent) return;
    this.connectSent = true;

    const params = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "webchat-ui",
        version: "1.0.0",
        platform: typeof navigator !== 'undefined' ? navigator.platform : "web",
        mode: "webchat",
      },
      auth: this.opts.token || this.opts.password ? {
        token: this.opts.token,
        password: this.opts.password,
      } : undefined,
    };

    this.request<GatewayHelloOk>("connect", params)
      .then((hello) => {
        this.backoffMs = 800;
        this.opts.onHello?.(hello);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "connect failed";
        // Check for auth-related errors
        if (message.includes("auth") || message.includes("token") || message.includes("unauthorized")) {
          this.opts.onConnectError?.("Authentication failed. Please check your token.");
        } else {
          this.opts.onConnectError?.(message);
        }
        this.ws?.close(4008, "connect failed");
      });
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const frame = parsed as { type?: unknown };
    
    if (frame.type === "event") {
      const evt = parsed as GatewayEventFrame;
      this.opts.onEvent?.(evt);
      return;
    }

    if (frame.type === "res") {
      const res = parsed as GatewayResponseFrame;
      const pending = this.pending.get(res.id);
      if (!pending) return;
      this.pending.delete(res.id);
      if (res.ok) pending.resolve(res.payload);
      else pending.reject(new Error(res.error?.message ?? "request failed"));
      return;
    }
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("gateway not connected"));
    }
    const id = generateUUID();
    const frame = { type: "req", id, method, params };
    const p = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
    });
    this.ws.send(JSON.stringify(frame));
    return p;
  }

  // Send a chat message
  async sendChat(message: string, sessionKey?: string, idempotencyKey?: string): Promise<void> {
    return this.request("chat.send", {
      sessionKey: sessionKey ?? this.opts.sessionKey ?? "agent:main:main",
      message,
      deliver: false,
      idempotencyKey,
    });
  }

  // Abort a running chat
  async abortChat(sessionKey: string, runId?: string): Promise<void> {
    return this.request("chat.abort", { sessionKey, runId });
  }

  // Load chat history
  async loadHistory(sessionKey?: string, limit = 50): Promise<{ messages: unknown[] }> {
    return this.request("chat.history", {
      sessionKey: sessionKey ?? this.opts.sessionKey ?? "agent:main:main",
      limit,
    });
  }

  // List sessions
  async listSessions(opts?: { activeMinutes?: number; limit?: number }): Promise<{ sessions: unknown[] }> {
    return this.request("sessions.list", opts ?? {});
  }

  /**
   * Set verbose level for a session.
   * Required for tool events to emit on the agent stream.
   */
  async setVerboseLevel(sessionKey: string, level: "on" | "off"): Promise<void> {
    return this.request("sessions.update", {
      sessionKey,
      verboseLevel: level,
    });
  }

  /**
   * Get session stats including token usage.
   * Returns stats for a specific session key.
   */
  async getSessionStats(sessionKey: string): Promise<SessionStats | null> {
    const result = await this.request<{ sessions: SessionStats[] }>("sessions.list", {
      keys: [sessionKey],
      limit: 1,
    });
    return result.sessions?.[0] ?? null;
  }
}

/**
 * Session stats returned from gateway.
 */
export type SessionStats = {
  key: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  contextTokens?: number;
  model?: string;
  modelProvider?: string;
  reasoningLevel?: string;
};
