# Phase 4: Sidebar-Centric Layout Redesign

> **Goal**: Move header and chat input into the sidebar to maximize conversation area.

---

## Current Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Sidebar]  │  [Header: Logo, Status, Settings]                      │
│            │─────────────────────────────────────────────────────────│
│ Sessions   │                                                         │
│ - Main     │           💬 Chat Messages                              │
│ - Sub1     │                                                         │
│ - Sub2     │                                                         │
│            │                                                         │
│            │─────────────────────────────────────────────────────────│
│            │  [Input: Textarea + Submit]                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Issues:**
- Chat area is constrained by header + input
- Wasted horizontal space in header
- Input takes vertical space from messages

---

## Proposed Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ [Sidebar]                    │                                      │
│ ┌──────────────────────────┐ │                                      │
│ │ 🤖 Cortana     ⚙️ 🌙     │ │                                      │
│ │ ● Connected              │ │       💬 Chat Messages               │
│ └──────────────────────────┘ │       (Full Height)                  │
│                              │                                      │
│ Sessions                     │                                      │
│ ▼ 💬 Main Session            │                                      │
│   └── 🤖 Haiku Gen (17s)     │                                      │
│ ▶ 💬 Session abc123          │                                      │
│                              │                                      │
│ ┌──────────────────────────┐ │                                      │
│ │ [Chat Input]             │ │                                      │
│ │ ________________________ │ │                                      │
│ │ |                      | │ │                                      │
│ │ |______________________|🚀│ │                                      │
│ └──────────────────────────┘ │                                      │
└────────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Chat messages get full viewport height (minus minimal padding)
- Header info consolidated into sidebar header
- Input integrated into sidebar (always visible, consistent location)
- Clean, distraction-free conversation view

---

## Component Structure

### Before
```
<Page>
  <SessionSidebar />
  <MainContent>
    <Header />
    <Conversation />
    <PromptInput />
  </MainContent>
</Page>
```

### After
```
<Page>
  <SessionSidebar>
    <SidebarHeader />      {/* Logo, status, settings */}
    <SessionList />        {/* Tree of sessions */}
    <SidebarInput />       {/* Chat input at bottom */}
  </SessionSidebar>
  <ConversationPanel>
    <Conversation />       {/* Full height messages */}
  </ConversationPanel>
</Page>
```

---

## Implementation Steps

### Step 1: Sidebar Header Component

Move logo, connection status, and settings into sidebar:

```typescript
// src/components/sidebar-header.tsx
export function SidebarHeader({ connected, onSettingsClick }) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5" />
          <span className="font-semibold">Cortana</span>
          <span className={cn(
            "w-2 h-2 rounded-full",
            connected ? "bg-green-500" : "bg-red-500"
          )} />
        </div>
        <div className="flex gap-1">
          <ThemeToggle />
          <SettingsButton />
        </div>
      </div>
    </div>
  );
}
```

### Step 2: Sidebar Input Component

Simplified input for sidebar (narrower):

```typescript
// src/components/sidebar-input.tsx
export function SidebarInput({ onSubmit, onAbort, canAbort, connected }) {
  return (
    <div className="p-3 border-t">
      <div className="relative">
        <textarea
          className="w-full resize-none rounded-lg border p-3 pr-10"
          placeholder="Message..."
          rows={2}
        />
        <button className="absolute right-2 bottom-2">
          {canAbort ? <StopIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}
```

### Step 3: Update Page Layout

```typescript
// src/app/page.tsx
<div className="flex h-screen">
  <SessionSidebar
    header={<SidebarHeader ... />}
    footer={<SidebarInput ... />}
    ...
  />
  <main className="flex-1 overflow-hidden">
    <Conversation className="h-full">
      ...
    </Conversation>
  </main>
</div>
```

### Step 4: Responsive Behavior

- **Desktop (>1024px)**: Sidebar always visible, 280px wide
- **Tablet (768-1024px)**: Sidebar collapsible, overlay on mobile
- **Mobile (<768px)**: Sidebar hidden, swipe/button to reveal, input moves to bottom of conversation

---

## Known Issues to Fix First

Before implementing layout redesign:

| Issue | Priority | Fix |
|-------|----------|-----|
| **Stop button text overflow** | 🔴 HIGH | Replace `PromptInputButton` with icon-only stop |
| **Input overflow** | 🔴 HIGH | Review `PromptInputTextarea` max-height/overflow |
| **Delete session** | 🟡 MEDIUM | Already implemented in sidebar, verify it works |

---

## Estimated Time

| Task | Time |
|------|------|
| Sidebar header component | 30 min |
| Sidebar input component | 45 min |
| Page layout restructure | 45 min |
| Responsive behavior | 30 min |
| Testing + polish | 30 min |
| **Total** | **~3 hours** |

---

## Alternatives Considered

### Alt A: Floating Input
Keep input at bottom of conversation (floating over messages).
- ❌ Covers content when typing long messages
- ❌ Awkward on mobile

### Alt B: Split Panel
Resizable sidebar with input.
- ⚠️ More complex
- ⚠️ Users may not discover resize

### Alt C: Sticky Header
Keep header at top, just move input.
- ❌ Still wastes vertical space
- ❌ Inconsistent with "sidebar-centric" goal

**Decision**: Header in sidebar, input in main content area (centered). Input placement in sidebar felt awkward — center screen is more natural.

---

## Visual Mockup

### Collapsed Sidebar
```
┌───┬──────────────────────────────────────┐
│🤖 │                                      │
│   │                                      │
│💬 │        Chat Messages                 │
│💬 │        (Maximum Space)               │
│🤖 │                                      │
│   │                                      │
│📝 │                                      │
└───┴──────────────────────────────────────┘
```

### Expanded Sidebar (280px)
```
┌─────────────────────┬────────────────────┐
│ 🤖 Cortana    ⚙️ 🌙 │                    │
│ ● Connected         │                    │
│─────────────────────│                    │
│ ▼ 💬 Main Session   │   Chat Messages    │
│   └── 🤖 Haiku Gen  │   (Full Height)    │
│ ▶ 💬 Session abc    │                    │
│                     │                    │
│─────────────────────│                    │
│ [Type message...]   │                    │
│ [________________🚀]│                    │
└─────────────────────┴────────────────────┘
```
