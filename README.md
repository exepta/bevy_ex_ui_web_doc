# Bevy Extended UI Docs + WASM Examples

## Struktur
- `src/` React/Vite Doku-Webseite
- `wasm/` Rust-Workspace fuer Bevy-WASM Beispiele
- `wasm/examples/base/` dynamische WASM-Basis (`/examples/base/`)

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

Dynamische WASM-Basis bauen:
```bash
pnpm wasm:example:build
```

Nur die Base direkt bauen:
```bash
pnpm wasm:example:build:base
```

Output landet in:
- `public/examples/base/`

Danach sind die Beispiele erreichbar unter:
- `http://localhost:5173/examples/base/` (bei `pnpm dev`)
- `https://<base.url>/examples/base/` (deployt)

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
- WASM Basis: `http://localhost:8080/examples/base/`

## Hinweis
Der Docker-Build baut aktuell die React-Webseite. Die WASM-Beispiele sollten vorher mit `pnpm wasm:example:build` erzeugt werden, damit sie unter `public/examples/` im Image enthalten sind.

## CI/CD Deploy (beta + release)
Automatisches Deployment passiert ueber `.github/workflows/deploy.yml`:

- Push auf Branch `beta` deployt nach `dev.tilt-us.com/libraries/docs/bevy_extended_ui`
- Push auf Branch `release` deployt nach `tilt-us.com/libraries/docs/bevy_extended_ui`

Auf dem Server laufen drei Container:

- `bevy-docs-beta` (Nginx App Container)
- `bevy-docs-release` (Nginx App Container)
- `bevy-docs-edge` (Nginx Reverse Proxy nach Domain + Pfad)

### GitHub Secrets
Folgende Secrets im Repository anlegen:

- `DEPLOY_SSH_USER` (SSH User auf `85.215.116.15`)
- `DEPLOY_SSH_PRIVATE_KEY` (privater Key fuer den User)
- optional: `DEPLOY_SSH_PORT` (Standard ist `22`)

### Einmaliger Server-Setup
Einmalig auf dem Server ausfuehren:

```bash
sudo mkdir -p /opt/bevy-ex-ui-web-doc/nginx
sudo chown -R "$USER:$USER" /opt/bevy-ex-ui-web-doc
```

Danach reicht ein Push auf `beta` oder `release`.

### DNS
Die Domains muessen per A-Record auf `85.215.116.15` zeigen:

- `dev.tilt-us.com`
- `tilt-us.com`

Hinweis: Das eingecheckte Proxy-Setup terminiert aktuell nur HTTP auf Port `80`.
HTTPS/TLS kann davor ueber IONOS oder einen separaten TLS-Reverse-Proxy terminiert werden.
