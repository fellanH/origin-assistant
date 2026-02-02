"use client";

import { SparklesIcon, CodeIcon, PenLineIcon, LightbulbIcon, SearchIcon } from "lucide-react";

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

const suggestions = [
  {
    icon: CodeIcon,
    label: "Code",
    prompts: [
      "Write a Python script to...",
      "Debug this error message",
      "Explain this code to me",
    ],
  },
  {
    icon: PenLineIcon,
    label: "Write",
    prompts: [
      "Draft an email about...",
      "Help me write a README",
      "Summarize this document",
    ],
  },
  {
    icon: LightbulbIcon,
    label: "Learn",
    prompts: [
      "Explain how... works",
      "What's the difference between...",
      "Teach me about...",
    ],
  },
  {
    icon: SearchIcon,
    label: "Research",
    prompts: [
      "Find information about...",
      "Compare these options",
      "What are the pros and cons of...",
    ],
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Working late?";
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  const greeting = getGreeting();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-in fade-in duration-500">
      {/* Logo */}
      <div className="relative mb-8">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <SparklesIcon className="w-10 h-10 md:w-12 md:h-12 text-white" />
        </div>
        {/* Subtle glow effect */}
        <div className="absolute inset-0 w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-30 blur-xl -z-10" />
      </div>

      {/* Greeting */}
      <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
        {greeting}
      </h2>
      <p className="text-muted-foreground max-w-md text-sm md:text-base mb-8">
        I&apos;m Cortana, your AI assistant. I can help you code, write, learn, and explore ideas.
      </p>

      {/* Suggestion categories */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {suggestions.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.label}
                onClick={() => onSuggestionClick(category.prompts[0])}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-card/50 hover:bg-card border border-border/50 hover:border-border transition-all duration-200 hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 group-hover:from-blue-500/20 group-hover:via-purple-500/20 group-hover:to-pink-500/20 flex items-center justify-center transition-colors">
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "What can you help me with?",
            "Tell me something interesting",
            "Let's brainstorm an idea",
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSuggestionClick(prompt)}
              className="px-4 py-2 rounded-full bg-accent/50 hover:bg-accent border border-transparent hover:border-border/50 text-sm text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
