---
source: https://ai-sdk.dev/elements/components/stack-trace
scraped: 2026-02-02T09:36:39.429Z
category: code
---

# Stack Trace

Displays formatted JavaScript/Node.js error stack traces with syntax highlighting and collapsible frames.

The `StackTrace` component displays formatted JavaScript/Node.js error stack traces with clickable file paths, internal frame dimming, and collapsible content.

at UserList ()at renderWithHooks ()at mountIndeterminateComponent ()at beginWork ()at HTMLUnknownElement.callCallback ()at Object.invokeGuardedCallbackDev ()at invokeGuardedCallback ()at beginWork$1 ()at performUnitOfWork ()at workLoopSync ()

## Installation
```
npx ai-elements@latest add stack-trace
```

## Usage with AI SDK

Build an error display tool that shows stack traces from AI-generated code using the [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) hook.

Add the following component to your frontend:

app/page.tsx
```
'use client';

import { useChat } from '@ai-sdk/react';
import {
  StackTrace,
  StackTraceHeader,
  StackTraceError,
  StackTraceErrorType,
  StackTraceErrorMessage,
  StackTraceActions,
  StackTraceCopyButton,
  StackTraceExpandButton,
  StackTraceContent,
  StackTraceFrames,
} from '@/components/ai-elements/stack-trace';

export default function Page() {
  const { messages } = useChat({
    api: '/api/run-code',
  });

  return (
    div className="max-w-4xl mx-auto p-6">
      {messages.map((message) => {
        const toolInvocations = message.parts?.filter(
          (part) => part.type === 'tool-invocation'
        );

        return toolInvocations?.map((tool) => {
          if (tool.toolName === 'runCode' && tool.result?.error) {
            return (
              StackTrace
                key={tool.toolCallId}
                trace={tool.result.error}
                defaultOpen
              >
                StackTraceHeader>
                  StackTraceError>
                    StackTraceErrorType />
                    StackTraceErrorMessage />
                  StackTraceError>
                  StackTraceActions>
                    StackTraceCopyButton />
                    StackTraceExpandButton />
                  StackTraceActions>
                StackTraceHeader>
                StackTraceContent>
                  StackTraceFrames />
                StackTraceContent>
              StackTrace>
            );
          }
          return null;
        });
      })}
    div>
  );
}
```

Add the following route to your backend:

api/run-code/route.ts
```
import { streamText, tool } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: 'openai/gpt-4o',
    messages,
    tools: {
      runCode: tool({
        description: 'Execute JavaScript code and return any errors',
        parameters: z.object({
          code: z.string(),
        }),
        execute: async ({ code }) => {
          try {
            // Execute code in sandbox
            eval(code);
            return { success: true };
          } catch (error) {
            return { error: (error as Error).stack };
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
```

## Features

- Parses standard JavaScript/Node.js stack trace format

- Highlights error type in red

- Dims internal frames (node_modules, node: paths)

- Collapsible content with smooth animation

- Copy full stack trace to clipboard

- Clickable file paths with line/column numbers

## Examples

### Collapsed by Default

### Hide Internal Frames

at UserList ()at App ()

## Props

###

###

###

###

###

###

###

###

###

###