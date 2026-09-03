import { ApiClient } from "agentmux/client";
import type { App, EventFrame } from "agentmux/protocol";
import type { Config } from "./config.ts";

/** The App agentmux runs for a configured part: the command, or nothing. */
function appFor(argv: string[] | undefined): App | null {
  return argv ? { kind: "command", command: argv } : null;
}

/** The util name the workspace pane's configured command is registered under. */
export const WORKSPACE_UTIL = "workspace";

/**
 * Put the config on the Instance: an app on every configured part, the
 * placeholder on every part the config leaves out, and the right-Tray app
 * on every Agent that exists now (the Tray app covers later ones).
 * Visibility is untouched; agentmux remembers each part's wish. Idempotent:
 * agentmux only restarts a pane whose app actually changed.
 */
export async function applyConfig(client: ApiClient, config: Config): Promise<void> {
  const tray = appFor(config.parts.tray);
  if (tray) await client.request("tray.set_app", { app: tray });
  else await client.request("tray.clear_app");

  const slot = appFor(config.parts["tray-slot"]);
  await client.request("tray.slot.set_app", {
    app: slot ?? { kind: "placeholder", text: "slot" },
  });

  const workspace = appFor(config.parts["workspace-pane"]);
  const state = await client.request("ui.get");
  if (workspace) {
    await client.request("workspacePane.set_util", {
      name: WORKSPACE_UTIL,
      app: workspace,
      scope: "global",
    });
    if (state.workspacePane.active === null) {
      await client.request("workspacePane.select_util", { name: WORKSPACE_UTIL });
    }
  } else if (state.workspacePane.utils[WORKSPACE_UTIL]) {
    await client.request("workspacePane.remove_util", { name: WORKSPACE_UTIL });
  }

  const status = await client.request("instance.status");
  for (const agent of status.agents) await applyRightTray(client, config, agent.name);
}

/** The right Tray is per Agent: give the configured app to one Agent. */
export async function applyRightTray(
  client: ApiClient,
  config: Config,
  agent: string,
): Promise<void> {
  const app = appFor(config.parts["right-tray"]);
  if (app) await client.request("rightTray.set_app", { agent, app });
  else await client.request("rightTray.clear_app", { agent });
}

/**
 * Keep the right Tray true for Agents that appear later. Runs until the
 * connection closes or `stop` is called; the Tray app hosts it, since that
 * process lives exactly while Agents exist.
 */
export async function followAgents(socket: string, config: Config): Promise<{ stop: () => void }> {
  const known = new Set<string>();
  let client: ApiClient | null = null;
  const onEvent = (event: EventFrame) => {
    if (event.event !== "agents.changed" || !client) return;
    const names = new Set(event.data.agents.map((agent) => agent.name));
    for (const name of names) {
      if (known.has(name)) continue;
      known.add(name);
      void applyRightTray(client, config, name).catch(() => {});
    }
    for (const name of known) if (!names.has(name)) known.delete(name);
  };
  client = await ApiClient.connectWithRetry(socket, { onEvent });
  await client.request("events.subscribe");
  // The Tray app is spawned by the first Agent, so an Agent can exist before
  // this connects; cover those too. Setting the same app again is a no-op.
  const status = await client.request("instance.status");
  for (const agent of status.agents) {
    known.add(agent.name);
    await applyRightTray(client, config, agent.name);
  }
  return { stop: () => client?.close() };
}
