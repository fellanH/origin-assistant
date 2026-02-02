---
source: https://ai-sdk.dev/elements/components/sandbox
scraped: 2026-02-02T09:36:38.424Z
category: code
---

# Sandbox

A collapsible container for displaying AI-generated code and output in chat interfaces.

The `Sandbox` component provides a structured way to display AI-generated code alongside its execution output in chat conversations. It features a collapsible container with status indicators and tabbed navigation between code and output views. It's designed to be used with `CodeBlock` for displaying code and `StackTrace` for displaying errors.
```
import math
def calculate_primes(limit):    """Find all prime numbers up to a given limit using Sieve of Eratosthenes."""    sieve = [True] * (limit + 1)    sieve[0] = sieve[1] = False        for i in range(2, int(math.sqrt(limit)) + 1):        if sieve[i]:            for j in range(i * i, limit + 1, i):                sieve[j] = False        return [i for i, is_prime in enumerate(sieve) if is_prime]
if __name__ == "__main__":    primes = calculate_primes(50)    print(f"Found {len(primes)} prime numbers up to 50:")    print(primes)
```

## Installation
```
npx ai-elements@latest add sandbox
```

## Features

- Collapsible container with smooth animations

- Status badges showing execution state (Pending, Running, Completed, Error)

- Tabs for Code and Output views

- Syntax-highlighted code display

- Copy button for easy code sharing

- Works with AI SDK tool state patterns

## Usage with AI SDK

The Sandbox component integrates with the AI SDK's tool state to show code generation progress:

components/code-sandbox.tsx
```
"use client";

import type { ToolUIPart } from "ai";
import {
  Sandbox,
  SandboxContent,
  SandboxHeader,
  SandboxTabContent,
  SandboxTabs,
  SandboxTabsBar,
  SandboxTabsList,
  SandboxTabsTrigger,
} from "@/components/ai-elements/sandbox";
import { CodeBlock } from "@/components/ai-elements/code-block";

type CodeSandboxProps = {
  toolPart: ToolUIPart;
};

export const CodeSandbox = ({ toolPart }: CodeSandboxProps) => {
  const code = toolPart.input?.code ?? "";
  const output = toolPart.output?.logs ?? "";

  return (
    Sandbox>
      SandboxHeader
        state={toolPart.state}
        title={toolPart.input?.filename ?? "code.tsx"}
      />
      SandboxContent>
        SandboxTabs defaultValue="code">
          SandboxTabsBar>
            SandboxTabsList>
              SandboxTabsTrigger value="code">CodeSandboxTabsTrigger>
              SandboxTabsTrigger value="output">OutputSandboxTabsTrigger>
            SandboxTabsList>
          SandboxTabsBar>
          SandboxTabContent value="code">
            CodeBlock code={code} language="tsx" />
          SandboxTabContent>
          SandboxTabContent value="output">
            CodeBlock code={output} language="log" />
          SandboxTabContent>
        SandboxTabs>
      SandboxContent>
    Sandbox>
  );
};
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