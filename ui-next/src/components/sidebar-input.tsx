"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { SendIcon, SquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarInputProps = {
  onSubmit: (text: string) => void;
  onAbort: () => void;
  canAbort: boolean;
  connected: boolean;
  disabled?: boolean;
};

export function SidebarInput({
  onSubmit,
  onAbort,
  canAbort,
  connected,
  disabled = false,
}: SidebarInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (canAbort) {
      onAbort();
      return;
    }
    if (!value.trim() || !connected || disabled) return;
    onSubmit(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = !connected || disabled || (!value.trim() && !canAbort);

  return (
    <div className="p-3 border-t border-border/50">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !connected
              ? "Connecting..."
              : canAbort
                ? "Generating..."
                : "Message..."
          }
          disabled={!connected || canAbort}
          rows={1}
          className={cn(
            "w-full resize-none rounded-xl border border-border/50 bg-background/50",
            "px-3 py-2.5 pr-10 text-sm",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        />
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={cn(
            "absolute right-2 bottom-2 p-1.5 rounded-lg transition-all duration-200",
            canAbort
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "bg-primary/10 text-primary hover:bg-primary/20",
            "disabled:opacity-30 disabled:cursor-not-allowed"
          )}
        >
          {canAbort ? (
            <SquareIcon className="w-4 h-4 fill-current" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground/40 mt-2">
        Shift+Enter for new line
      </p>
    </div>
  );
}
