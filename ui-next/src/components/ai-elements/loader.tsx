"use client";

import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface LoaderIconProps {
  size?: number;
}

const LoaderIcon = ({ size = 16 }: LoaderIconProps) => (
  <svg
    height={size}
    strokeLinejoin="round"
    style={{ color: "currentcolor" }}
    viewBox="0 0 16 16"
    width={size}
  >
    <title>Loader</title>
    <g clipPath="url(#clip0_2393_1490)">
      <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 16V12"
        opacity="0.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.29773 1.52783L5.64887 4.7639"
        opacity="0.9"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.7023 1.52783L10.3511 4.7639"
        opacity="0.1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12.7023 14.472L10.3511 11.236"
        opacity="0.4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.29773 14.472L5.64887 11.236"
        opacity="0.6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M15.6085 5.52783L11.8043 6.7639"
        opacity="0.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M0.391602 10.472L4.19583 9.23598"
        opacity="0.7"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M15.6085 10.4722L11.8043 9.2361"
        opacity="0.3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M0.391602 5.52783L4.19583 6.7639"
        opacity="0.8"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </g>
    <defs>
      <clipPath id="clip0_2393_1490">
        <rect fill="white" height="16" width="16" />
      </clipPath>
    </defs>
  </svg>
);

export type LoaderVariant = "spinner" | "thinking" | "dots";

export type LoaderProps = {
  className?: string;
  size?: number;
  /** Variant style - spinner (default), thinking (with text), or dots */
  variant?: LoaderVariant;
  /** Optional label for thinking variant */
  label?: string;
};

/**
 * Animated thinking dots
 */
const ThinkingDots = () => (
  <span className="inline-flex gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-current"
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{
          duration: 1,
          repeat: Infinity,
          delay: i * 0.2,
        }}
      />
    ))}
  </span>
);

/**
 * Spinner with fade-in animation
 */
const AnimatedSpinner = ({ size }: { size: number }) => (
  <motion.div
    className="animate-spin"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.2 }}
  >
    <LoaderIcon size={size} />
  </motion.div>
);

export const Loader = ({
  className,
  size = 16,
  variant = "spinner",
  label,
}: LoaderProps) => {
  if (variant === "dots") {
    return (
      <motion.div
        className={cn(
          "inline-flex items-center justify-center text-muted-foreground",
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <ThinkingDots />
      </motion.div>
    );
  }

  if (variant === "thinking") {
    return (
      <motion.div
        className={cn(
          "flex items-center gap-3 py-3 text-muted-foreground",
          className
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <AnimatedSpinner size={size} />
        <span className="text-sm">{label || "Thinking"}<ThinkingDots /></span>
      </motion.div>
    );
  }

  // Default spinner
  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={cn("inline-flex items-center justify-center", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <AnimatedSpinner size={size} />
      </motion.div>
    </AnimatePresence>
  );
};
