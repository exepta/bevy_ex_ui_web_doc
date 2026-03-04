# Bevy Extended UI Docs + WASM Examples

## Struktur
- `src/` React/Vite Doku-Webseite
- `wasm/` Rust-Workspace fuer Bevy-WASM Beispiele
- `wasm/examples/<widget>/` ein Beispiel pro Widget (`/examples/<widget>/`)

## Bevy WASM Setup
Voraussetzungen:
- Rust Toolchain
- `wasm32-unknown-unknown` target
- `trunk`

Einrichtung:
```bash
rustup target add wasm32-unknown-unknown
cargo install trunk --locked
```

Alle Widget-Beispiele bauen:
```bash
pnpm wasm:example:build
```

Ein einzelnes Beispiel bauen:
```bash
pnpm wasm:example:build:button
```

Output landet in:
- `public/examples/<widget>/`

Danach sind die Beispiele erreichbar unter:
- `http://localhost:5173/examples/<widget>/` (bei `pnpm dev`)
- `https://<base.url>/examples/<widget>/` (deployt)

## Website lokal
```bash
pnpm install
pnpm dev
```

## Docker + Nginx
Build:
```bash
pnpm wasm:example:build
pnpm docker:build
```

Start:
```bash
pnpm docker:run
```

Dann:
- Website: `http://localhost:8080/`
- WASM Beispiele: `http://localhost:8080/examples/<widget>/`

## Hinweis
Der Docker-Build baut aktuell die React-Webseite. Die WASM-Beispiele sollten vorher mit `pnpm wasm:example:build` erzeugt werden, damit sie unter `public/examples/` im Image enthalten sind.
