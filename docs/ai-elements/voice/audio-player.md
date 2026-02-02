---
source: https://ai-sdk.dev/elements/components/audio-player
scraped: 2026-02-02T09:36:40.782Z
category: voice
---

# Audio Player

A composable audio player component built on media-chrome, with shadcn styling and flexible controls.

The `AudioPlayer` component provides a flexible and customizable audio playback interface built on top of media-chrome. It features a composable architecture that allows you to build audio experiences with custom controls, metadata display, and seamless integration with AI-generated audio content.

## Installation
```
npx ai-elements@latest add audio-player
```

## Features

- Built on media-chrome for reliable audio playback

- Fully composable architecture with granular control components

- ButtonGroup integration for cohesive control layout

- Individual control components (play, seek, volume, etc.)

- Flexible layout with customizable control bars

- CSS custom properties for deep theming

- Shadcn/ui Button component styling

- Responsive design that works across devices

- Full TypeScript support with proper types for all components

## Variants

### AI SDK Speech Result

The `AudioPlayer` component can be used to play audio from an AI SDK Speech Result.

### Remote Audio

The `AudioPlayer` component can be used to play remote audio files.

    Play
    Pause

          Seek backward

          Seek forward

    0:00

    0:00

    Mute
    Unmute

## Props

###

Root MediaController component. Accepts all MediaController props except `audio` (which is set to `true` by default).

###

The audio element that contains the media source. Accepts either a remote URL or AI SDK Speech Result data.

###

Container for control buttons, wraps children in a ButtonGroup.

###

Play/pause button wrapped in a shadcn Button component.

###

Seek backward button wrapped in a shadcn Button component.

###

Seek forward button wrapped in a shadcn Button component.

###

Displays the current playback time, wrapped in ButtonGroupText.

###

Seek slider for controlling playback position, wrapped in ButtonGroupText.

###

Displays the total duration of the audio, wrapped in ButtonGroupText.

###

Mute/unmute button, wrapped in ButtonGroupText.

###

Volume slider control, wrapped in ButtonGroupText.