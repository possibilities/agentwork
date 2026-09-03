#!/usr/bin/env bash
# A setup installs no command: agentmux runs bin/tray by the instance
# config's `setup = <this checkout>`. This only makes the checkout runnable.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "${1:-}" == "--uninstall" ]]; then
  rm -f "${HOME}/.local/bin/agentwork"  # the retired CLI's link, if one is left
  echo "nothing to remove beyond a retired ~/.local/bin/agentwork link"
  exit 0
fi

command -v bun >/dev/null || { echo "bun is required" >&2; exit 1; }
[[ -d "${here}/../agentmux" ]] || { echo "expected the agentmux checkout beside this one at ${here}/../agentmux" >&2; exit 1; }

(cd "${here}" && bun install --frozen-lockfile)
chmod +x "${here}/bin/tray"
rm -f "${HOME}/.local/bin/agentwork"  # the retired CLI; the instance config names bin/tray now
echo "ready: ${here}/bin/tray (name this checkout with setup = in an agentmux instance config)"
