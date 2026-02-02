"use client";

import { ThemeDropdown } from "@/components/theme-toggle";
import { CheckIcon, XIcon } from "lucide-react";

interface SettingsPanelProps {
	gatewayUrl: string;
	onGatewayUrlChange: (url: string) => void;
	token: string;
	onTokenChange: (token: string) => void;
	sessionKey: string;
	onSessionKeyChange: (key: string) => void;
	onClose: () => void;
	isOverlay?: boolean;
}

export function SettingsPanel({
	gatewayUrl,
	onGatewayUrlChange,
	token,
	onTokenChange,
	sessionKey,
	onSessionKeyChange,
	onClose,
	isOverlay,
}: SettingsPanelProps) {
	return (
		<div
			className={`absolute top-16 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-5 w-80 animate-in fade-in slide-in-from-top-2 duration-200 ${isOverlay ? "left-4 right-4 w-auto max-w-80" : "left-4"}`}
		>
			<div className="flex items-center justify-between mb-4">
				<h3 className="font-semibold">Settings</h3>
				<button
					onClick={onClose}
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
						onChange={(e) => onGatewayUrlChange(e.target.value)}
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
						onChange={(e) => onTokenChange(e.target.value)}
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
						onChange={(e) => onSessionKeyChange(e.target.value)}
						className="w-full mt-1.5 px-3 py-2.5 bg-background/50 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
						placeholder="agent:main:main"
					/>
				</div>
				<ThemeDropdown />
			</div>
		</div>
	);
}
