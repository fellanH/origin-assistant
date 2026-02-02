"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export type LogoState = "idle" | "thinking" | "speaking";

interface OriginLogoProps {
	state?: LogoState;
	className?: string;
	size?: number;
}

export function OriginLogo({
	state = "idle",
	className,
	size = 40,
}: OriginLogoProps) {
	const outerRadius = size * 0.45;
	const innerRadius = size * 0.25;
	const strokeWidth = size * 0.06;
	const center = size / 2;

	return (
		<div
			className={cn("relative flex items-center justify-center", className)}
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Outer circle */}
				<motion.circle
					cx={center}
					cy={center}
					r={outerRadius}
					stroke="url(#outerGradient)"
					strokeWidth={strokeWidth}
					fill="none"
					initial={false}
					animate={
						state === "idle"
							? {
									scale: [1, 1.04, 1],
									opacity: [0.8, 1, 0.8],
								}
							: state === "thinking"
								? {
										rotate: 360,
										scale: 1,
										opacity: 1,
									}
								: {
										scale: [1, 1.08, 0.96, 1.04, 1],
										opacity: 1,
									}
					}
					transition={
						state === "idle"
							? {
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut",
								}
							: state === "thinking"
								? {
										rotate: {
											duration: 2,
											repeat: Infinity,
											ease: "linear",
										},
										scale: { duration: 0.3 },
										opacity: { duration: 0.3 },
									}
								: {
										duration: 0.6,
										repeat: Infinity,
										ease: "easeInOut",
									}
					}
					style={{ transformOrigin: "center" }}
				/>

				{/* Inner circle */}
				<motion.circle
					cx={center}
					cy={center}
					r={innerRadius}
					stroke="url(#innerGradient)"
					strokeWidth={strokeWidth}
					fill="none"
					initial={false}
					animate={
						state === "idle"
							? {
									scale: [1, 0.96, 1],
									opacity: [0.9, 1, 0.9],
								}
							: state === "thinking"
								? {
										rotate: -360,
										scale: [1, 0.85, 1],
									}
								: {
										scale: [1, 0.9, 1.1, 0.95, 1],
										opacity: 1,
									}
					}
					transition={
						state === "idle"
							? {
									duration: 3,
									repeat: Infinity,
									ease: "easeInOut",
									delay: 0.5,
								}
							: state === "thinking"
								? {
										rotate: {
											duration: 1.5,
											repeat: Infinity,
											ease: "linear",
										},
										scale: {
											duration: 1,
											repeat: Infinity,
											ease: "easeInOut",
										},
									}
								: {
										duration: 0.5,
										repeat: Infinity,
										ease: "easeInOut",
										delay: 0.1,
									}
					}
					style={{ transformOrigin: "center" }}
				/>

				{/* Gradient definitions */}
				<defs>
					<linearGradient
						id="outerGradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="100%"
					>
						<stop offset="0%" stopColor="#3b82f6" />
						<stop offset="100%" stopColor="#1d4ed8" />
					</linearGradient>
					<linearGradient
						id="innerGradient"
						x1="0%"
						y1="100%"
						x2="100%"
						y2="0%"
					>
						<stop offset="0%" stopColor="#60a5fa" />
						<stop offset="100%" stopColor="#3b82f6" />
					</linearGradient>
				</defs>
			</svg>
		</div>
	);
}
