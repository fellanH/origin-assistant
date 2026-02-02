---
source: https://ai-sdk.dev/elements/components/terminal
scraped: 2026-02-02T09:36:39.781Z
category: code
---

# Terminal

Display streaming console output with full ANSI color support.

The `Terminal` component displays console output with ANSI color support, streaming indicators, and auto-scroll functionality.
```
```

## Installation
```
npx ai-elements@latest add terminal
```

## Features

- Full ANSI color support (256 colors, bold, italic, underline)

- Streaming mode with cursor animation

- Auto-scroll to latest output

- Copy output to clipboard

- Clear button support

- Dark terminal theme

## ANSI Support

The Terminal uses `ansi-to-react` to parse ANSI escape codes:
```
\x1b[32m✓\x1b[0m Success    # Green checkmark
\x1b[31m✗\x1b[0m Error      # Red X
\x1b[33mwarn\x1b[0m Warning   # Yellow text
\x1b[1mBold\x1b[0m           # Bold text
```

## Examples

### Basic Usage
```
npm install complete
```

### Streaming Mode
```
```

### With Clear Button
```
$ npm run build
Building project...
✓ Compiled successfully
✓ Bundle size: 124kb
```

## Props

###

###

###

###

###

###

###

###