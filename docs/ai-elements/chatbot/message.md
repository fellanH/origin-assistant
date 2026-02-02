---
source: https://ai-sdk.dev/elements/components/message
scraped: 2026-02-02T09:36:32.282Z
category: chatbot
---

# Message

A comprehensive suite of components for displaying chat messages, including message rendering, branching, actions, and markdown responses.

The `Message` component suite provides a complete set of tools for building chat interfaces. It includes components for displaying messages from users and AI assistants, managing multiple response branches, adding action buttons, and rendering markdown content.

How do React hooks work and when should I use them?
# React Hooks Guide

React hooks are functions that let you "hook into" React state and lifecycle features from function components. Here's what you need to know:

## Core Hooks

### useState

Adds state to functional components:

### useEffect

Handles side effects (data fetching, subscriptions, DOM updates):

## When to Use Hooks

- ✅ Function components - Hooks only work in function components

- ✅ Replacing class components - Modern React favors hooks over classes

- ✅ Sharing stateful logic - Create custom hooks to reuse logic

- ❌ Class components - Use lifecycle methods instead

## Rules of Hooks

- Only call hooks at the top level (not inside loops, conditions, or nested functions)

- Only call hooks from React functions (components or custom hooks)

Would you like to explore more advanced hooks like `useCallback` or `useMemo`?

React hooks are special functions that let you use React features in function components. The most common ones are:

- useState - for managing component state

- useEffect - for side effects like data fetching

- useContext - for consuming context values

- useRef - for accessing DOM elements

Here's a simple example:

Which specific hook would you like to learn more about?

Absolutely! React hooks are a powerful feature introduced in React 16.8. They solve several problems:

## Key Benefits

- Simpler code - No need for class components

- Reusable logic - Extract stateful logic into custom hooks

- Better organization - Group related code together

## Most Popular Hooks

| Hook | Purpose |  |
| useState | Add state to components |  |
| useEffect | Handle side effects |  |
| useContext | Access context values |  |
| useReducer | Complex state logic |  |
| useCallback | Memoize functions |  |
| useMemo | Memoize values |  |

The beauty of hooks is that they let you reuse stateful logic without changing your component hierarchy. Want to dive into a specific hook?

**Important:** After adding the component, you'll need to add the following to your `globals.css` file:
```
@source "../node_modules/streamdown/dist/*.js";
```

This is **required** for the MessageResponse component to work properly. Without this import, the Streamdown styles will not be applied to your project. See [Streamdown's documentation](https://streamdown.ai/) for more details.

## Installation
```
npx ai-elements@latest add message
```

## Features

- Displays messages from both user and AI assistant with distinct styling and automatic alignment

- Minimalist flat design with user messages in secondary background and assistant messages full-width

- **Response branching** with navigation controls to switch between multiple AI response versions

- **Markdown rendering** with GFM support (tables, task lists, strikethrough), math equations, and smart streaming

- **Action buttons** for common operations (retry, like, dislike, copy, share) with tooltips and state management

- **File attachments** display with support for images and generic files with preview and remove functionality

- Code blocks with syntax highlighting and copy-to-clipboard functionality

- Keyboard accessible with proper ARIA labels

- Responsive design that adapts to different screen sizes

- Seamless light/dark theme integration

Branching is an advanced use case you can implement to suit your needs. While the AI SDK does not provide built-in branching support, you have full flexibility to design and manage multiple response paths.

## Usage with AI SDK

Build a simple chat UI where the user can copy or regenerate the most recent message.

Add the following component to your frontend:

app/page.tsx
```
'use client';

import { useState } from 'react';
import { MessageActions, MessageAction } from '@/components/ai-elements/message';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Input,
  PromptInputTextarea,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { MessageResponse } from '@/components/ai-elements/message';
import { RefreshCcwIcon, CopyIcon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { Fragment } from 'react';

const ActionsDemo = () => {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, regenerate } = useChat();

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
        Conversation>
          ConversationContent>
            {messages.map((message, messageIndex) => (
              Fragment key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      const isLastMessage =
                        messageIndex === messages.length - 1;

                      return (
                        Fragment key={`${message.id}-${i}`}>
                          Message from={message.role}>
                            MessageContent>
                              MessageResponse>{part.text}MessageResponse>
                            MessageContent>
                          Message>
                          {message.role === 'assistant' && isLastMessage && (
                            MessageActions>
                              MessageAction
                                onClick={() => regenerate()}
                                label="Retry"
                              >
                                RefreshCcwIcon className="size-3" />
                              MessageAction>
                              MessageAction
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                CopyIcon className="size-3" />
                              MessageAction>
                            MessageActions>
                          )}
                        Fragment>
                      );
                    default:
                      return null;
                  }
                })}
              Fragment>
            ))}
          ConversationContent>
          ConversationScrollButton />
        Conversation>

        Input
          onSubmit={handleSubmit}
          className="mt-4 w-full max-w-2xl mx-auto relative"
        >
          PromptInputTextarea
            value={input}
            placeholder="Say something..."
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

export default ActionsDemo;
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

###

###

###

###

A container component for displaying file attachments in a message. Automatically positions attachments at the end of the message with proper spacing and alignment.

**Example:**
```
MessageAttachments className="mb-2">
  {files.map((attachment) => (
    MessageAttachment data={attachment} key={attachment.url} />
  ))}
```

###

Displays a single file attachment. Images are shown as thumbnails (96px × 96px) with rounded corners. Non-image files show a paperclip icon with the filename.

**Example:**
```

  data={{
    type: "file",
    url: "https://example.com/image.jpg",
    mediaType: "image/jpeg",
    filename: "image.jpg"
  }}
  onRemove={() => console.log("Remove clicked")}
/>
```