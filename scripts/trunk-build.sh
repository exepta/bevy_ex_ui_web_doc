#!/usr/bin/env bash
set -euo pipefail

example_dir="${1:-}"

if [[ -z "${example_dir}" ]]; then
  echo "usage: $0 <example-dir>" >&2
  exit 1
fi

if [[ ! -d "${example_dir}" ]]; then
  echo "example directory not found: ${example_dir}" >&2
  exit 1
fi

if command -v trunk >/dev/null 2>&1; then
  trunk_bin="$(command -v trunk)"
elif [[ -x "${HOME}/.cargo/bin/trunk" ]]; then
  trunk_bin="${HOME}/.cargo/bin/trunk"
else
  cat >&2 <<'EOF'
trunk not found.
Install with:
  cargo install trunk
Then add ~/.cargo/bin to your PATH.
EOF
  exit 1
fi

(
  cd "${example_dir}"
  # pnpm/CI may export NO_COLOR=1; trunk expects bool strings for this flag.
  unset NO_COLOR
  "${trunk_bin}" build --release
)
