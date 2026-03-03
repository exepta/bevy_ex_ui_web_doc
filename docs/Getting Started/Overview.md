---
title: Overview
---

# Bevy Extended UI - Overview

<p class="description">Bevy Extended UI is an open-source UI crate for the Bevy Engine that brings a richer HTML/CSS-like UI workflow to Bevy projects.</p>

## Introduction

Bevy Extended UI was created to provide complex UI elements that are missing in default `bevy_ui`, such as sliders, choice boxes, checkboxes, and radio buttons.

It lets you build user interfaces faster with declarative markup, CSS styling, and code bindings instead of rebuilding common controls from scratch.

:::info
Current latest crate version is **1.4.2**.
Add both `bevy_extended_ui` and `bevy_extended_ui_macros` to your dependencies.
:::

## Advantages of Bevy Extended UI

- **Faster UI development:** Build advanced controls using reusable HTML and CSS conventions.
- **Widget coverage:** Includes many built-in widgets and is open for contributions.
- **Code bindings:** Events like `onclick`, `onchange`, `action`, and keyboard/drag events connect markup directly to Rust functions.
- **Hot reload support:** Iterate on UI layout and style quickly during development.
- **WASM support:** Includes web-related feature presets like `wasm-default`, `wasm-breakpoints`, and `clipboard-wasm`.

## Core Features

- HTML support
- CSS support (subset)
- `@keyframes` animation support
- `@media` breakpoint support
- Form validation and submission hooks
- Font family and font weight handling
- Cursor and custom cursor support

## Start now

Add this to your `Cargo.toml`:

```toml
[dependencies]
bevy_extended_ui = "1.4.2"
bevy_extended_ui_macros = "1.4.2"
```

Register the plugin:

```rust
app.add_plugins(ExtendedUiPlugin);
```

Then load an HTML asset into your `UiRegistry` and bind handlers with `#[html_fn("...")]`.
