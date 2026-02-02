"use client";

import { MenuIcon, SparklesIcon } from "lucide-react";

interface MobileHeaderProps {
	onMenuClick: () => void;
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-border/50 dark:border-border/60 bg-card/50 backdrop-blur-xl flex-shrink-0">
			<button
				onClick={onMenuClick}
				className="p-2 -ml-2 rounded-xl hover:bg-accent/70 dark:hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
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
			<div className="w-9" />
		</div>
	);
}
