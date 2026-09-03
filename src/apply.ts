import type { ApiClient } from "agentmux/client";
import type { App } from "agentmux/protocol";
import type { Config, Part } from "./config.ts";

/** The App agentmux runs for a configured part: the command, or nothing. */
function appFor(argv: string[] | undefined): App | null {
  return argv ? { kind: "command", command: argv } : null;
}

/** The agentmux verbs behind each config key; every part has the same four. */
const VERBS: Record<
  Part,
  {
    set: "tray.set_app" | "tray.slot.set_app" | "workspacePane.set_app" | "rightTray.set_app";
    clear:
      | "tray.clear_app"
      | "tray.slot.set_app"
      | "workspacePane.clear_app"
      | "rightTray.clear_app";
  }
> = {
  tray: { set: "tray.set_app", clear: "tray.clear_app" },
  "tray-slot": { set: "tray.slot.set_app", clear: "tray.slot.set_app" },
  "workspace-pane": { set: "workspacePane.set_app", clear: "workspacePane.clear_app" },
  "right-tray": { set: "rightTray.set_app", clear: "rightTray.clear_app" },
};

const VISIBILITY: Record<
  Part,
  {
    show: "tray.show" | "tray.slot.show" | "workspacePane.show" | "rightTray.show";
    hide: "tray.hide" | "tray.slot.hide" | "workspacePane.hide" | "rightTray.hide";
  }
> = {
  tray: { show: "tray.show", hide: "tray.hide" },
  "tray-slot": { show: "tray.slot.show", hide: "tray.slot.hide" },
  "workspace-pane": { show: "workspacePane.show", hide: "workspacePane.hide" },
  "right-tray": { show: "rightTray.show", hide: "rightTray.hide" },
};

/**
 * Put the config on the Instance: an app on every configured part, the
 * placeholder on every part the config leaves out, and each part shown or
 * hidden as its `.visible` says. Idempotent: agentmux only restarts a pane
 * whose app actually changed, and a show on a shown part is a no-op.
 */
export async function applyConfig(client: ApiClient, config: Config): Promise<void> {
  for (const part of Object.keys(VERBS) as Part[]) {
    const app = appFor(config.parts[part]);
    const verbs = VERBS[part];
    if (app) await client.request(verbs.set, { app });
    else if (verbs.clear === "tray.slot.set_app") {
      // The slot has no clear verb; its placeholder is set by hand.
      await client.request(verbs.clear, { app: { kind: "placeholder", text: "slot" } });
    } else await client.request(verbs.clear);
    await client.request(config.visible[part] ? VISIBILITY[part].show : VISIBILITY[part].hide);
  }
}
