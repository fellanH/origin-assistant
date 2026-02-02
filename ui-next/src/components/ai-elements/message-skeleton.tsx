"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import type { HTMLAttributes } from "react";

interface MessageSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Role determines styling (user = right aligned, assistant = left) */
  role?: "user" | "assistant";
  /** Number of skeleton lines to show */
  lines?: number;
}

/**
 * Skeleton placeholder for message content during loading.
 * Uses Framer Motion for smooth shimmer effect.
 */
export function MessageSkeleton({
  role = "assistant",
  lines = 3,
  className,
  ...props
}: MessageSkeletonProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 py-3",
        isUser ? "items-end" : "items-start",
        className
      )}
      {...props}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "h-4 rounded-md",
            isUser ? "bg-primary/15 dark:bg-primary/20" : "bg-muted/60 dark:bg-muted/80"
          )}
          style={{
            width: i === lines - 1 ? "60%" : i === 0 ? "85%" : "75%",
          }}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}

interface ConversationSkeletonProps {
  className?: string;
  /** Number of message pairs to show */
  messageCount?: number;
}

/**
 * Skeleton placeholder for entire conversation during session loading.
 */
export function ConversationSkeleton({
  messageCount = 2,
  className,
}: ConversationSkeletonProps) {
  return (
    <motion.div
      className={cn("flex flex-col gap-8 p-4", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {Array.from({ length: messageCount }).map((_, i) => (
        <div key={i} className="flex flex-col gap-6">
          {/* User message skeleton */}
          <MessageSkeleton role="user" lines={1} />
          {/* Assistant message skeleton */}
          <MessageSkeleton role="assistant" lines={i === messageCount - 1 ? 4 : 3} />
        </div>
      ))}
    </motion.div>
  );
}
