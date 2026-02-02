---
source: https://ai-sdk.dev/elements/components/edge
scraped: 2026-02-02T09:36:43.871Z
category: workflow
---

# Edge

Customizable edge components for React Flow canvases with animated and temporary states.

The `Edge` component provides two pre-styled edge types for React Flow canvases: `Temporary` for dashed temporary connections and `Animated` for connections with animated indicators.

The Edge component is designed to be used with the [Canvas](/elements/en/elements/components/canvas) component. See the [Workflow](/elements/en/elements/examples/workflow) demo for a full example.

## Installation
```
npx ai-elements@latest add edge
```

## Features

- Two distinct edge types: Temporary and Animated

- Temporary edges use dashed lines with ring color

- Animated edges include a moving circle indicator

- Automatic handle position calculation

- Smart offset calculation based on handle type and position

- Uses Bezier curves for smooth, natural-looking connections

- Fully compatible with React Flow's edge system

- Type-safe implementation with TypeScript

## Edge Types

### Edge.Temporary

A dashed edge style for temporary or preview connections. Uses a simple Bezier path with a dashed stroke pattern.

### Edge.Animated

A solid edge with an animated circle that moves along the path. The animation repeats indefinitely with a 2-second duration, providing visual feedback for active connections.

## Props

Both edge types accept standard React Flow `EdgeProps`: