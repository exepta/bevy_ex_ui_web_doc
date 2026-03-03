# Bevy Extended UI Docs + WASM Examples

## Struktur
- `src/` React/Vite Doku-Webseite
- `wasm/` Rust-Workspace fuer Bevy-WASM Beispiele
- `wasm/examples/button/` erstes Beispiel (`/examples/button`)

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

Button-Beispiel bauen:
```bash
pnpm wasm:build:button
```

Output landet in:
- `public/examples/button/`

Danach ist das Beispiel unter erreichbar:
- `http://localhost:5173/examples/button/` (bei `pnpm dev`)
- `https://<base.url>/examples/button/` (deployt)

## Website lokal
```bash
pnpm install
pnpm dev
```

## Docker + Nginx
Build:
```bash
pnpm wasm:build:button
pnpm docker:build
```

Start:
```bash
pnpm docker:run
```

Dann:
- Website: `http://localhost:8080/`
- WASM Beispiel: `http://localhost:8080/examples/button/`

## Hinweis
Der Docker-Build baut aktuell die React-Webseite. Die WASM-Beispiele sollten vorher mit `pnpm wasm:build:*` erzeugt werden, damit sie unter `public/examples/` im Image enthalten sind.
