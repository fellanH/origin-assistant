---
source: https://ai-sdk.dev/elements/components/code-block
scraped: 2026-02-02T09:36:36.735Z
category: code
---

# Code Block

Provides syntax highlighting, line numbers, and copy to clipboard functionality for code blocks.

The `CodeBlock` component provides syntax highlighting, line numbers, and copy to clipboard functionality for code blocks. It's fully composable, allowing you to customize the header, actions, and content.
```
function greet(name: string): string {  return `Hello, ${name}!`;}
console.log(greet("World"));
```

## Installation
```
npx ai-elements@latest add code-block
```

## Usage

The CodeBlock is fully composable. Here's a basic example:
```
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockTitle,
} from '@/components/ai-elements/code-block';
import { FileIcon } from 'lucide-react';

export const Example = () => (
  CodeBlock code={code} language="typescript">
    CodeBlockHeader>
      CodeBlockTitle>
        FileIcon size={14} />
        CodeBlockFilename>example.tsCodeBlockFilename>
      CodeBlockTitle>
      CodeBlockActions>
        CodeBlockCopyButton />
      CodeBlockActions>
    CodeBlockHeader>
  CodeBlock>
);
```

## Features

- Syntax highlighting with Shiki

- Line numbers (optional)

- Copy to clipboard functionality

- Automatic light/dark theme switching via CSS variables

- Language selector for multi-language examples

- Fully composable architecture

- Accessible design

## Examples

### Dark Mode

To use the `CodeBlock` component in dark mode, wrap it in a `div` with the `dark` class.
```
function MyComponent(props) {  return (
# Hello, {props.name}!
      This is an example React component.      );}
```

### Language Selector

Add a language selector to switch between different code implementations:
```
function greet(name: string): string {  return `Hello, ${name}!`;}
console.log(greet("World"));
```

## Props

###

###

Container for the header row. Uses flexbox with `justify-between`.

###

Left-aligned container for icon and filename. Uses flexbox with `gap-2`.

###

Displays the filename in monospace font.

###

Right-aligned container for action buttons. Uses flexbox with `gap-2`.

###

###

Wrapper for the language selector. Extends shadcn/ui Select.

###

Trigger button for the language selector dropdown. Pre-styled for code block header.

###

Displays the selected language value.

###

Dropdown content container. Defaults to `align="end"`.

###

Individual language option in the dropdown.

###

Low-level container component with performance optimizations (`contentVisibility`). Used internally by CodeBlock.

###

Low-level component that handles syntax highlighting. Used internally by CodeBlock, but can be used directly for custom layouts.