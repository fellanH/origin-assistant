---
source: https://ai-sdk.dev/elements/components/prompt-input
scraped: 2026-02-02T09:36:33.348Z
category: chatbot
---

# Prompt Input

Allows a user to send a message with file attachments to a large language model. It includes a textarea, file upload capabilities, a submit button, and a dropdown for selecting the model.

The `PromptInput` component allows a user to send a message with file attachments to a large language model. It includes a textarea, file upload capabilities, a submit button, and a dropdown for selecting the model.

## Installation
```
npx ai-elements@latest add prompt-input
```

## Usage with AI SDK

Build a fully functional chat app using `PromptInput`, [`Conversation`](/elements/en/elements/components/conversation) with a model picker:

Add the following component to your frontend:

app/page.tsx
```
'use client';

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from '@/components/ai-elements/attachment';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { GlobeIcon } from 'lucide-react';
import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    Attachments variant="inline">
      {attachments.files.map((attachment) => (
        Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          AttachmentPreview />
          AttachmentRemove />
        Attachment>
      ))}
    Attachments>
  );
};

const models = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus' },
];

const InputDemo = () => {
  const [text, setText] = useStatestring>('');
  const [model, setModel] = useStatestring>(models[0].id);
  const [useWebSearch, setUseWebSearch] = useStateboolean>(false);

  const { messages, status, sendMessage } = useChat();

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: message.files
      },
      {
        body: {
          model: model,
          webSearch: useWebSearch,
        },
      },
    );
    setText('');
  };

  return (
    div className="max-w-4xl mx-auto p-6 relative size-full rounded-lg border h-[600px]">
      div className="flex flex-col h-full">
        Conversation>
          ConversationContent>
            {messages.map((message) => (
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
            ))}
          ConversationContent>
          ConversationScrollButton />
        Conversation>

        PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          PromptInputHeader>
            PromptInputAttachmentsDisplay />
          PromptInputHeader>
          PromptInputBody>

            PromptInputTextarea
              onChange={(e) => setText(e.target.value)}
              value={text}
            />
          PromptInputBody>
          PromptInputFooter>
            PromptInputTools>
              PromptInputActionMenu>
                PromptInputActionMenuTrigger />
                PromptInputActionMenuContent>
                  PromptInputActionAddAttachments />
                PromptInputActionMenuContent>
              PromptInputActionMenu>
              PromptInputButton
                onClick={() => setUseWebSearch(!useWebSearch)}
                variant={useWebSearch ? 'default' : 'ghost'}
              >
                GlobeIcon size={16} />
                span>Searchspan>
              PromptInputButton>
              PromptInputSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
              >
                PromptInputSelectTrigger>
                  PromptInputSelectValue />
                PromptInputSelectTrigger>
                PromptInputSelectContent>
                  {models.map((model) => (
                    PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    PromptInputSelectItem>
                  ))}
                PromptInputSelectContent>
              PromptInputSelect>
            PromptInputTools>
            PromptInputSubmit disabled={!text && !status} status={status} />
          PromptInputFooter>
        PromptInput>
      div>
    div>
  );
};

export default InputDemo;
```

Add the following route to your backend:

app/api/chat/route.ts
```
import { streamText, UIMessage, convertToModelMessages } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    model,
    messages,
    webSearch
  }: {
    messages: UIMessage[];
    model: string;
    webSearch?: boolean;
  } = await req.json();

  const result = streamText({
    model: webSearch ? 'perplexity/sonar' : model,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

## Features

- Auto-resizing textarea that adjusts height based on content

- File attachment support with drag-and-drop

- Image preview for image attachments

- Configurable file constraints (max files, max size, accepted types)

- Automatic submit button icons based on status

- Support for keyboard shortcuts (Enter to submit, Shift+Enter for new line)

- Customizable min/max height for the textarea

- Flexible toolbar with support for custom actions and tools

- Built-in model selection dropdown

- Built-in native speech recognition button (Web Speech API)

- Optional provider for lifted state management

- Form automatically resets on submit

- Responsive design with mobile-friendly controls

- Clean, modern styling with customizable themes

- Form-based submission handling

- Hidden file input sync for native form posts

- Global document drop support (opt-in)

## Examples

### Cursor style

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

### Attachments

Attachment components have been moved to a separate module. See the [Attachment](/elements/en/elements/components/attachment) component documentation for details on ``, ``, ``, ``, and ``.

###

###

###

###

###

###

Optional global provider that lifts PromptInput state outside of PromptInput. When used, it allows you to access and control the input state from anywhere within the provider tree. If not used, PromptInput stays fully self-managed.

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

###

###

###

###

## Hooks

### usePromptInputAttachments

Access and manage file attachments within a PromptInput context.
```
const attachments = usePromptInputAttachments();

// Available methods:
attachments.files // Array of current attachments
attachments.add(files) // Add new files
attachments.remove(id) // Remove an attachment by ID
attachments.clear() // Clear all attachments
attachments.openFileDialog() // Open file selection dialog
```

### usePromptInputController

Access the full PromptInput controller from a PromptInputProvider. Only available when using the provider.
```
const controller = usePromptInputController();

// Available methods:
controller.textInput.value // Current text input value
controller.textInput.setInput(value) // Set text input value
controller.textInput.clear() // Clear text input
controller.attachments // Same as usePromptInputAttachments
```

### useProviderAttachments

Access attachments context from a PromptInputProvider. Only available when using the provider.
```
const attachments = useProviderAttachments();

// Same interface as usePromptInputAttachments
```

### usePromptInputReferencedSources

Access referenced sources context within a PromptInput.
```
const sources = usePromptInputReferencedSources();

// Available methods:
sources.sources // Array of current referenced sources
sources.add(sources) // Add new source(s)
sources.remove(id) // Remove a source by ID
sources.clear() // Clear all sources
```