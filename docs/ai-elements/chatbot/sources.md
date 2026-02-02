---
source: https://ai-sdk.dev/elements/components/sources
scraped: 2026-02-02T09:36:34.711Z
category: chatbot
---

# Sources

A component that allows a user to view the sources or citations used to generate a response.

The `Sources` component allows a user to view the sources or citations used to generate a response.

## Installation
```
npx ai-elements@latest add sources
```

## Usage with AI SDK

Build a simple web search agent with Perplexity Sonar.

Add the following component to your frontend:

app/page.tsx
```
'use client';

import { useChat } from '@ai-sdk/react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Input,
  PromptInputTextarea,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { useState } from 'react';
import { DefaultChatTransport } from 'ai';

const SourceDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/sources',
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  return (
    div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      div className="flex flex-col h-full">
        div className="flex-1 overflow-auto mb-4">
          Conversation>
            ConversationContent>
              {messages.map((message) => (
                div key={message.id}>
                  {message.role === 'assistant' && (
                    Sources>
                      SourcesTrigger
                        count={
                          message.parts.filter(
                            (part) => part.type === 'source-url',
                          ).length
                        }
                      />
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'source-url':
                            return (
                              SourcesContent key={`${message.id}-${i}`}>
                                Source
                                  key={`${message.id}-${i}`}
                                  href={part.url}
                                  title={part.url}
                                />
                              SourcesContent>
                            );
                        }
                      })}
                    Sources>
                  )}
                  Message from={message.role} key={message.id}>
                    MessageContent>
                      {message.parts.map((part, i) => {
                        switch (part.type) {
                          case 'text':
                            return (
                              MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              MessageResponse>
                            );
                          default:
                            return null;
                        }
                      })}
                    MessageContent>
                  Message>
                div>
              ))}
            ConversationContent>
            ConversationScrollButton />
          Conversation>
        div>

        Input
          onSubmit={handleSubmit}
          className="mt-4 w-full max-w-2xl mx-auto relative"
        >
          PromptInputTextarea
            value={input}
            placeholder="Ask a question and search the..."
            onChange={(e) => setInput(e.currentTarget.value)}
            className="pr-12"
          />
          PromptInputSubmit
            status={status === 'streaming' ? 'streaming' : 'ready'}
            disabled={!input.trim()}
            className="absolute bottom-1 right-1"
          />
        Input>
      div>
    div>
  );
};

export default SourceDemo;
```

Add the following route to your backend:

api/chat/route.ts
```
import { convertToModelMessages, streamText, UIMessage } from 'ai';
import { perplexity } from '@ai-sdk/perplexity';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'perplexity/sonar',
    system:
      'You are a helpful assistant. Keep your responses short (,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
  });
}
```

## Features

- Collapsible component that allows a user to view the sources or citations used to generate a response

- Customizable trigger and content components

- Support for custom sources or citations

- Responsive design with mobile-friendly controls

- Clean, modern styling with customizable themes

## Examples

### Custom rendering

## Props

###

###

###

###