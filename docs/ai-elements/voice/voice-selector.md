---
source: https://ai-sdk.dev/elements/components/voice-selector
scraped: 2026-02-02T09:36:42.499Z
category: voice
---

# Voice Selector

A composable dialog component for selecting AI voices with metadata display and search functionality.

The `VoiceSelector` component provides a flexible and composable interface for selecting AI voices. Built on shadcn/ui's Dialog and Command components, it features a searchable voice list with support for metadata display (gender, accent, age), grouping, and customizable layouts. The component includes a context provider for accessing voice selection state from any nested component.

## Installation
```
npx ai-elements@latest add voice-selector
```

## Features

- Fully composable architecture with granular control components

- Built on shadcn/ui Dialog and Command components

- React Context API for accessing state in nested components

- Searchable voice list with real-time filtering

- Support for voice metadata with icons and emojis (gender icons, accent flags, age)

- Voice preview button with play/pause/loading states

- Voice grouping with separators and bullet dividers

- Keyboard navigation support

- Controlled and uncontrolled component patterns

- Full TypeScript support with proper types for all components

## Props

###

Root Dialog component that provides context for all child components. Manages both voice selection and dialog open states.

###

Button or element that opens the voice selector dialog.

###

Container for the Command component and voice list, rendered inside the dialog.

###

Alternative dialog implementation using CommandDialog for a full-screen command palette style.

###

Search input for filtering voices.

###

Scrollable container for voice items and groups.

###

Message shown when no voices match the search query.

###

Groups related voices together with an optional heading.

###

Selectable item representing a voice.

###

Visual separator between voice groups.

###

Displays the voice name with proper styling.

###

Displays the voice gender metadata with icons from Lucide. Supports multiple gender identities with corresponding icons.

###

Displays the voice accent metadata with emoji flags representing different countries/regions.

###

Displays the voice age metadata with muted styling and tabular numbers for consistent alignment.

###

Displays a description for the voice with muted styling.

###

Container for grouping voice attributes (gender, accent, age) together. Use with `VoiceSelectorBullet` for separation.

###

Displays a bullet separator (•) between voice attributes. Hidden from screen readers via `aria-hidden`.

###

Displays keyboard shortcuts for voice items.

###

A button that allows users to preview/play a voice sample before selecting it. Shows play, pause, or loading icons based on state.

## Hooks

### useVoiceSelector()

A custom hook for accessing the voice selector context. This hook allows you to access and control the voice selection state from any component nested within `VoiceSelector`.
```
import { useVoiceSelector } from "@repo/elements/voice-selector";

export default function CustomVoiceDisplay() {
  const { value, setValue, open, setOpen } = useVoiceSelector();

  return (
    div>
      p>Selected voice: {value ?? "None"}p>
      button onClick={() => setOpen(!open)}>
        Toggle Dialog
      button>
    div>
  );
}
```

#### Return Value