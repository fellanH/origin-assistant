---
source: https://ai-sdk.dev/elements/components/agent
scraped: 2026-02-02T09:36:36.054Z
category: code
---

# Agent

A composable component for displaying AI agent configuration with model, instructions, tools, and output schema.

The `Agent` component displays an interface for showing AI agent configuration details. It's designed to represent a configured agent from the AI SDK, showing the agent's model, system instructions, available tools (with expandable input schemas), and output schema.

You are a helpful research assistant. Your job is to search the web for information and summarize findings for the user. Always cite your sources and provide accurate, up-to-date information.

###

###

###
Output Schema
```
z.object({  sentiment: z.enum(['positive', 'negative', 'neutral']),  score: z.number(),  summary: z.string(),})
```

## Installation
```
npx ai-elements@latest add agent
```

## Usage with AI SDK

Display an agent's configuration alongside your chat interface. Tools are displayed in an accordion where clicking the description expands to show the input schema.

app/page.tsx
```
'use client';

import { tool } from 'ai';
import { z } from 'zod';
import {
  Agent,
  AgentContent,
  AgentHeader,
  AgentInstructions,
  AgentOutput,
  AgentTool,
  AgentTools,
} from '@/components/ai-elements/agent';

const webSearch = tool({
  description: 'Search the web for information',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
});

const readUrl = tool({
  description: 'Read and parse content from a URL',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to read'),
  }),
});

const outputSchema = `z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral']),
  score: z.number(),
  summary: z.string(),
})`;

export default function Page() {
  return (
    Agent>
      AgentHeader name="Sentiment Analyzer" model="anthropic/claude-sonnet-4-5" />
      AgentContent>
        AgentInstructions>
          Analyze the sentiment of the provided text and return a structured
          analysis with sentiment classification, confidence score, and summary.
        AgentInstructions>
        AgentTools>
          AgentTool tool={webSearch} value="web_search" />
          AgentTool tool={readUrl} value="read_url" />
        AgentTools>
        AgentOutput schema={outputSchema} />
      AgentContent>
    Agent>
  );
}
```

## Features

- Model badge in header

- Instructions rendered as markdown

- Tools displayed as accordion items with expandable input schemas

- Output schema display with syntax highlighting

- Composable structure for flexible layouts

- Works with AI SDK `Tool` type

## Props

###

###

###

###

###

###

###