---
source: https://ai-sdk.dev/elements/components/queue
scraped: 2026-02-02T09:36:33.695Z
category: chatbot
---

# Queue

A comprehensive queue component system for displaying message lists, todos, and collapsible task sections in AI applications.

The `Queue` component provides a flexible system for displaying lists of messages, todos, attachments, and collapsible sections. Perfect for showing AI workflow progress, pending tasks, message history, or any structured list of items in your application.

- What is the roadmap for Q4?
- Update the default logo to this png.![](https://github.com/haydenbleasel.png)
- Please generate a changelog.
- Add dark mode support.
- Optimize database queries.
- Set up CI/CD pipeline.

- Write project documentationComplete the README and API docs
- Implement authentication
- Fix bug #42Resolve crash on settings page
- Refactor queue logicUnify queue and todo state management
- Add unit testsIncrease test coverage for hooks

## Installation
```
npx ai-elements@latest add queue
```

## Features

- Flexible component system with composable parts

- Collapsible sections with smooth animations

- Support for completed/pending state indicators

- Built-in scroll area for long lists

- Attachment display with images and file indicators

- Hover-revealed action buttons for queue items

- TypeScript support with comprehensive type definitions

- Customizable styling with Tailwind CSS

- Responsive design with mobile-friendly interactions

- Keyboard navigation and accessibility support

- Theme-aware with automatic dark mode support

## Examples

### With PromptInput

Complete the README and API docs- Implement authentication
- Fix bug #42Resolve crash on settings page
- Refactor queue logicUnify queue and todo state management
- Add unit testsIncrease test coverage for hooks

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

###

###

###

## Type Exports

### QueueMessagePart

Interface for message parts within queue messages.
```
interface QueueMessagePart {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
}
```

### QueueMessage

Interface for queue message items.
```
interface QueueMessage {
  id: string;
  parts: QueueMessagePart[];
}
```

### QueueTodo

Interface for todo items in the queue.
```
interface QueueTodo {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "completed";
}
```