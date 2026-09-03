import { ApiClient } from "agentmux/client";
import type { AgentsChanged, EventFrame } from "agentmux/protocol";
import { fxnkRamp, type Theme } from "./ramp.ts";
import { TrayList, type TrayRow } from "./tray-list.ts";

/**
 * The Tray process: lives in the left pane, never takes focus, never reads a
 * key. It mirrors the daemon's Agent list and turns a press on a row into
 * `agent.show`. tmux forwards mouse events to it; every key goes to the
 * Viewport.
 */
export async function runTray(options: { apiSocket: string; theme: Theme }): Promise<number> {
  // Imported dynamically per fleet convention: the native package top-level
  // awaits and races under parallel test isolation.
  const core = await import("@opentui/core");
  const renderer = await core.createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: ["SIGTERM", "SIGHUP"],
    screenMode: "alternate-screen",
    targetFps: 30,
    autoFocus: false,
  });
  let theme = options.theme;
  renderer.setBackgroundColor(core.RGBA.defaultBackground());

  let agents: AgentsChanged = { agents: [], shown: null };
  const { promise: done, resolve: finish } = Promise.withResolvers<number>();

  let client: ApiClient | null = null;
  const list = new TrayList(renderer, theme, (name) => {
    void client?.request("agent.show", { name }).catch(() => {});
  });
  renderer.root.add(list.root);

  // fmx's empty state, and the Screen's: one dim line, centred, until the
  // first Agent. An empty list would read as nothing at all.
  const empty = new core.BoxRenderable(renderer, {
    id: "tray-empty",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    visible: false,
  });
  const emptyText = new core.TextRenderable(renderer, {
    id: "tray-empty-text",
    content: "no agents",
    fg: fxnkRamp(theme).dim,
    selectable: false,
  });
  empty.add(emptyText);
  renderer.root.add(empty);

  const paint = () => {
    const rows: TrayRow[] = agents.agents.map((agent) => ({
      name: agent.name,
      status: agent.status,
      active: agent.name === agents.shown,
    }));
    list.root.visible = rows.length > 0;
    empty.visible = rows.length === 0;
    list.render(rows, renderer.width);
    renderer.requestRender();
  };

  const onEvent = (event: EventFrame) => {
    if (event.event === "agents.changed") {
      agents = event.data;
      paint();
    } else if (event.event === "theme.changed") {
      theme = event.data.theme;
      list.applyTheme(theme);
      emptyText.fg = fxnkRamp(theme).dim;
      paint();
    } else if (event.event === "instance.stopping") {
      finish(0);
    }
  };

  try {
    client = await ApiClient.connectWithRetry(options.apiSocket, {
      onEvent,
      onClose: () => finish(0),
    });
    await client.request("events.subscribe");
    const status = await client.request("instance.status");
    agents = { agents: status.agents, shown: status.shown };
    if (status.theme !== theme) {
      theme = status.theme;
      list.applyTheme(theme);
      emptyText.fg = fxnkRamp(theme).dim;
    }
    paint();
  } catch (error) {
    renderer.destroy();
    process.stderr.write(`tray: ${(error as Error).message}\n`);
    return 1;
  }

  renderer.on("resize", paint);
  const code = await done;
  client.close();
  renderer.destroy();
  return code;
}
