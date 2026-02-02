---
source: https://ai-sdk.dev/elements/components/context
scraped: 2026-02-02T09:36:31.249Z
category: chatbot
---

# Context

A compound component system for displaying AI model context window usage, token consumption, and cost estimation.

The `Context` component provides a comprehensive view of AI model usage through a compound component system. It displays context window utilization, token consumption breakdown (input, output, reasoning, cache), and cost estimation in an interactive hover card interface.

## Installation
```
npx ai-elements@latest add context
```

## Features

- **Compound Component Architecture**: Flexible composition of context display elements

- **Visual Progress Indicator**: Circular SVG progress ring showing context usage percentage

- **Token Breakdown**: Detailed view of input, output, reasoning, and cached tokens

- **Cost Estimation**: Real-time cost calculation using the `tokenlens` library

- **Intelligent Formatting**: Automatic token count formatting (K, M, B suffixes)

- **Interactive Hover Card**: Detailed information revealed on hover

- **Context Provider Pattern**: Clean data flow through React Context API

- **TypeScript Support**: Full type definitions for all components

- **Accessible Design**: Proper ARIA labels and semantic HTML

- **Theme Integration**: Uses currentColor for automatic theme adaptation

## Props

###

###

###

###

###

###

### Usage Components

All usage components (`ContextInputUsage`, `ContextOutputUsage`, `ContextReasoningUsage`, `ContextCacheUsage`) share the same props:

## Component Architecture

The Context component uses a compound component pattern with React Context for data sharing:

- **``** - Root provider component that holds all context data

- **``** - Interactive trigger element (default: button with percentage)

- **``** - Hover card content container

- **``** - Header section with progress visualization

- **``** - Body section for usage breakdowns

- **``** - Footer section for total cost

- **Usage Components** - Individual token usage displays (Input, Output, Reasoning, Cache)

## Token Formatting

The component uses `Intl.NumberFormat` with compact notation for automatic formatting:

- Under 1,000: Shows exact count (e.g., "842")

- 1,000+: Shows with K suffix (e.g., "32K")

- 1,000,000+: Shows with M suffix (e.g., "1.5M")

- 1,000,000,000+: Shows with B suffix (e.g., "2.1B")

## Cost Calculation

When a `modelId` is provided, the component automatically calculates costs using the `tokenlens` library:

- **Input tokens**: Cost based on model's input pricing

- **Output tokens**: Cost based on model's output pricing

- **Reasoning tokens**: Special pricing for reasoning-capable models

- **Cached tokens**: Reduced pricing for cached input tokens

- **Total cost**: Sum of all token type costs

Costs are formatted using `Intl.NumberFormat` with USD currency.

## Styling

The component uses Tailwind CSS classes and follows your design system:

- Progress indicator uses `currentColor` for theme adaptation

- Hover card has customizable width and padding

- Footer has a secondary background for visual separation

- All text sizes use the `text-xs` class for consistency

- Muted foreground colors for secondary information