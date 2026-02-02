---
source: https://ai-sdk.dev/elements/components/attachments
scraped: 2026-02-02T09:36:29.881Z
category: chatbot
---

# Attachments

A flexible, composable attachment component for displaying files, images, videos, audio, and source documents.

The `Attachment` component provides a unified way to display file attachments and source documents with multiple layout variants.

![](https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=400&fit=crop)

## Installation
```
npx ai-elements@latest add attachments
```

## Usage with AI SDK

Display user-uploaded files in chat messages or input areas.

app/page.tsx
```
'use client';

import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
} from '@/components/ai-elements/attachments';
import type { FileUIPart } from 'ai';

interface MessageProps {
  attachments: (FileUIPart & { id: string })[];
  onRemove?: (id: string) => void;
}

const MessageAttachments = ({ attachments, onRemove }: MessageProps) => (
  Attachments variant="grid">
    {attachments.map((file) => (
      Attachment
        key={file.id}
        data={file}
        onRemove={onRemove ? () => onRemove(file.id) : undefined}
      >
        AttachmentPreview />
        AttachmentRemove />
      Attachment>
    ))}
  Attachments>
);

export default MessageAttachments;
```

## Features

- Three display variants: grid (thumbnails), inline (badges), and list (rows)

- Supports both FileUIPart and SourceDocumentUIPart from the AI SDK

- Automatic media type detection (image, video, audio, document, source)

- Hover card support for inline previews

- Remove button with customizable callback

- Composable architecture for maximum flexibility

- Accessible with proper ARIA labels

- TypeScript support with exported utility functions

## Examples

### Grid Variant

Best for displaying attachments in messages with visual thumbnails.

![](https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&h=400&fit=crop)

### Inline Variant

Best for compact badge-style display in input areas with hover previews.

mountain-landscape.jpgquarterly-report.pdfReact Documentationpodcast-episode.mp3

### List Variant

Best for file lists with full metadata display.

mountain-landscape.jpgimage/jpegquarterly-report-2024.pdfapplication/pdfproduct-demo.mp4video/mp4API Documentationtext/htmlmeeting-recording.mp3audio/mpeg

## Props

###

Container component that sets the layout variant.

###

Individual attachment item wrapper.

###

Displays the media preview (image, video, or icon).

###

Displays the filename and optional media type.

###

Remove button that appears on hover.

###

Wrapper for hover preview functionality.

###

Trigger element for the hover card.

###

Content displayed in the hover card.

###

Empty state component when no attachments are present.

## Utility Functions

### getMediaCategory(data)

Returns the media category for an attachment.
```
import { getMediaCategory } from '@/components/ai-elements/attachments';

const category = getMediaCategory(attachment);
// Returns: "image" | "video" | "audio" | "document" | "source" | "unknown"
```

### getAttachmentLabel(data)

Returns the display label for an attachment.
```
import { getAttachmentLabel } from '@/components/ai-elements/attachments';

const label = getAttachmentLabel(attachment);
// Returns filename or fallback like "Image" or "Attachment"
```