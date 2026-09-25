# Codex Emoji Picker

A high-performance, standalone web component engineered and optimized by **Codex** for seamless Unicode emoji selection and custom asset integration.

---

## Technical Overview

Codex Emoji Picker is designed as a drop-in UI module for web applications. It operates without external dependencies and provides full keyboard accessibility, state persistence, and dynamic extensibility.

### Core Architecture

* **Zero-Configuration Asset Injection:** The script dynamically resolves its origin at evaluation time to load the corresponding stylesheet without manual link tags.
* **Standalone UI Scope:** Independent of external CSS variables or CSS reset rules to ensure visual consistency across isolated environments.
* **Extensible Asset Pipeline:** Supports runtime registration of custom image packs alongside native Unicode categories.
* **Accessible Navigation:** Complete ARIA dialog compliance and full keyboard grid traversal (`Arrows`, `Enter`, `Escape`).
* **State Management:** Preserves user skin tone preferences, recent emoji history, and interface positioning via `localStorage`.

---

## Installation & Setup

### CDN Integration

Include the script directly into your HTML document. The component automatically injects its required stylesheet.

```html
<script src="https://cdn.jsdelivr.net/gh/AngelMxx/EmojisCD@main/EmojiPicker.js"></script>
```

### Basic Implementation

```javascript
// Open picker anchored to an element with automatic input targeting
CodexEmoji.open({
  anchor: document.getElementById('trigger-button'),
  target: document.getElementById('chat-input'),
  title: 'Emoji Picker',
  onPick: (emoji) => {
    console.log('Selected payload:', emoji);
  }
});
```

---

## API Specification

### Global Methods

#### `CodexEmoji.open(options)`
Instantiates and displays the emoji picker dialog.

* **Parameters:** `options` (`Object`) — Configuration parameters (see below).
* **Returns:** `HTMLElement` — The mounted modal DOM node.

#### `CodexEmoji.close()`
Destroys the active modal instance, unsubscribes document-level listeners, and executes cleanup handlers.

#### `CodexEmoji.registerSet(set)`
Registers a custom emoji set into the navigation rail.

* **Parameters:** `set` (`Object`)
  * `id` (`string`): Unique set identifier.
  * `label` (`string`): Human-readable name displayed on hover/accessibility tags.
  * `icon` (`string`): Icon URL or internal asset path.
  * `emoji` (`Array<Object>`): List of custom items containing `{ id, src, keywords }`.

#### `CodexEmoji.insertInto(textarea, text)`
Utility helper to insert text at the active caret position of a form control while preserving focus and firing input events.

---

### Configuration Options (`CodexEmoji.open`)

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `anchor` | `HTMLElement` | `null` | Target DOM element for context positioning. |
| `target` | `HTMLInputElement` | `null` | Input or textarea element where chosen emojis are inserted. |
| `title` | `string` | `'Emoji'` | Header title displayed on the window drag bar. |
| `closeOnPick` | `boolean` | `false` | Determines whether the picker closes automatically after a selection. |
| `onPick` | `function` | `null` | Callback triggered upon selection: `(emojiData) => {}`. |
| `onClose` | `function` | `null` | Callback executed immediately after the interface closes. |

---

## Compliance and Licensing

### Attribution Requirements

This software was engineered and optimized by **Codex**. All source distributions, embedded deployments, or documentation references must clearly credit **Codex** as the original developer.

### Usage Restrictions

1. **Non-Commercial Exclusivity:** This component is freely available for open-source, educational, and non-monetized applications. Direct sale, redistribution as a commercial product, or inclusion in paid software packages without authorization is prohibited.
2. **Policy Adherence:** Usage of this project requires strict compliance with all guidelines outlined on the [Codex Policies Portal](https://codex.org/policies).

For enterprise licensing or institutional deployment inquiries, refer to the [Codex Governance Directory](https://codex.org/policies).

---

*Copyright &copy; Codex. All rights reserved.*
