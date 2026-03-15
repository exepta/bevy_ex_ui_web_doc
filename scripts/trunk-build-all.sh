#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "${script_dir}/.." && pwd)"
trunk_build_script="${script_dir}/trunk-build.sh"
examples_root="${1:-${repo_root}/wasm/examples}"

if [[ ! -d "${examples_root}" ]]; then
  echo "examples root not found: ${examples_root}" >&2
  exit 1
fi

mapfile -t example_dirs < <(find "${examples_root}" -mindepth 1 -maxdepth 1 -type d | sort)

if [[ ${#example_dirs[@]} -eq 0 ]]; then
  echo "no example directories found in: ${examples_root}" >&2
  exit 1
fi

built_count=0
for example_dir in "${example_dirs[@]}"; do
  if [[ ! -f "${example_dir}/Trunk.toml" ]]; then
    continue
  fi

  built_count=$((built_count + 1))
  echo "==> Building ${example_dir}"
  bash "${trunk_build_script}" "${example_dir}"
done

if [[ ${built_count} -eq 0 ]]; then
  echo "no examples with Trunk.toml found in: ${examples_root}" >&2
  exit 1
fi

echo "Built ${built_count} WASM examples."
