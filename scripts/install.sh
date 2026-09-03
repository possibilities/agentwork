#!/usr/bin/env bash
# Editable source-link install: ~/.local/bin/agentwork -> <checkout>/src/main.ts.
# agentmux is a file: dependency on the sibling checkout, so ~/code/agentmux
# must exist and be installed first (its own scripts/install.sh).
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bin_dir="${HOME}/.local/bin"
link="${bin_dir}/agentwork"

if [[ "${1:-}" == "--uninstall" ]]; then
  rm -f "${link}"
  echo "removed ${link}"
  exit 0
fi

command -v bun >/dev/null || { echo "bun is required" >&2; exit 1; }
command -v agentmux >/dev/null || { echo "agentmux is required on PATH (install ~/code/agentmux first)" >&2; exit 1; }
[[ -d "${here}/../agentmux" ]] || { echo "expected the agentmux checkout beside this one at ${here}/../agentmux" >&2; exit 1; }

(cd "${here}" && bun install --frozen-lockfile)
mkdir -p "${bin_dir}"
chmod +x "${here}/src/main.ts"
ln -sfn "${here}/src/main.ts" "${link}"
echo "installed ${link} -> ${here}/src/main.ts"
