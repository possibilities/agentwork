#!/usr/bin/env bun
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { ApiClient } from "agentmux/client";
import { applyConfig, followAgents } from "./apply.ts";
import {
  type Config,
  ConfigError,
  DEFAULT_CONFIG_TEXT,
  defaultConfigPath,
  loadConfig,
} from "./config.ts";

const VERSION = "0.1.0";

const HELP = `agentwork ${VERSION} — a reference agentmux setup: the Tray app and a config naming a TUI for each part

usage: agentwork <command> [--config PATH]

commands
  start      start the config's agentmux instance if needed and put the config on it
  attach     put the config on the instance and attach this terminal to it
  apply      put the config on a running instance
  tray       the Tray app: the Agent list, for the Tray column (agentmux runs this)

options
  --config PATH     config file (default: ~/.config/agentwork/config)
  --attach          with start: attach once the instance is shaped
  --help, --version

The config names the instance and a command for each part: tray, tray-slot,
workspace-pane, right-tray. Whether a part is visible is agentmux's business
(its tray.*, workspacePane.* and rightTray.* verbs); agentwork only says what
runs there. Read README.md, then agentmux's USAGE.md.
`;

class UsageError extends Error {}

type Flags = { config: string; attach: boolean; positional: string[] };

function parseArgs(argv: string[]): Flags {
  const flags: Flags = { config: defaultConfigPath(), attach: false, positional: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    if (arg === "--config") {
      const value = argv[index + 1];
      if (value === undefined) throw new UsageError("--config needs a value");
      flags.config = value;
      index += 1;
    } else if (arg.startsWith("--config=")) flags.config = arg.slice("--config=".length);
    else if (arg === "--attach") flags.attach = true;
    else if (arg.startsWith("--")) throw new UsageError(`unknown option ${arg}`);
    else flags.positional.push(arg);
  }
  return flags;
}

type Status = { running: boolean; socket: string };

/** agentmux's own view of the instance; `agentmux status` exits 1 while it is down. */
async function instanceStatus(instance: string): Promise<Status> {
  const proc = Bun.spawn(["agentmux", "status", "--instance", instance], {
    stdout: "pipe",
    stderr: "inherit",
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  let parsed: { running?: boolean; socket?: string; sockets?: { api?: string } };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("agentmux status did not answer; is agentmux installed?");
  }
  const socket = parsed.sockets?.api ?? parsed.socket;
  if (!socket) throw new Error("agentmux status names no socket");
  return { running: parsed.running !== false && parsed.sockets !== undefined, socket };
}

async function agentmux(args: string[]): Promise<number> {
  const proc = Bun.spawn(["agentmux", ...args], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return await proc.exited;
}

async function apply(socket: string, config: Config): Promise<void> {
  const client = await ApiClient.connectWithRetry(socket);
  try {
    await applyConfig(client, config);
  } finally {
    client.close();
  }
}

/** The config file is written once so the human has every part's line to edit. */
async function ensureConfigFile(path: string): Promise<void> {
  if (await Bun.file(path).exists()) return;
  mkdirSync(dirname(path), { recursive: true });
  await Bun.write(path, DEFAULT_CONFIG_TEXT);
  process.stderr.write(`wrote ${path}\n`);
}

async function attach(config: Config, socket: string): Promise<number> {
  await apply(socket, config);
  return agentmux(["attach", "--instance", config.instance]);
}

async function main(argv: string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h") || argv.length === 0) {
    process.stdout.write(HELP);
    return argv.length === 0 ? 2 : 0;
  }
  if (argv.includes("--version")) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  const flags = parseArgs(argv);
  const [command] = flags.positional;
  if (command === "tray") {
    const { runTray } = await import("./tui/tray.ts");
    const socket = process.env["AGENTMUX_SOCKET"];
    if (!socket) throw new UsageError("tray runs inside agentmux; AGENTMUX_SOCKET is not set");
    // The Tray app is agentwork's resident presence in the Instance, alive
    // exactly while Agents exist, so it is what keeps the right Tray true for
    // Agents that appear later. A bad config must not take the Tray down:
    // agentmux would respawn it forever.
    let follower: { stop: () => void } | null = null;
    try {
      follower = await followAgents(socket, await loadConfig(flags.config));
    } catch (error) {
      process.stderr.write(`agentwork: not following agents: ${(error as Error).message}\n`);
    }
    try {
      return await runTray({
        apiSocket: socket,
        theme: process.env["AGENTMUX_THEME"] === "light" ? "light" : "dark",
      });
    } finally {
      follower?.stop();
    }
  }
  await ensureConfigFile(flags.config);
  const config = await loadConfig(flags.config);
  switch (command) {
    case "start": {
      let status = await instanceStatus(config.instance);
      if (!status.running) {
        const code = await agentmux(["start", "--instance", config.instance]);
        if (code !== 0) return code;
        status = await instanceStatus(config.instance);
      }
      if (flags.attach) return attach(config, status.socket);
      await apply(status.socket, config);
      return 0;
    }
    case "attach": {
      const status = await instanceStatus(config.instance);
      if (!status.running) {
        process.stderr.write(`instance "${config.instance}" is not running\n`);
        return 1;
      }
      return attach(config, status.socket);
    }
    case "apply": {
      const status = await instanceStatus(config.instance);
      if (!status.running) {
        process.stderr.write(`instance "${config.instance}" is not running\n`);
        return 1;
      }
      await apply(status.socket, config);
      return 0;
    }
    default:
      throw new UsageError(`unknown command "${command ?? ""}"`);
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: unknown) => {
    if (error instanceof UsageError) {
      process.stderr.write(`agentwork: ${error.message}\n${HELP}`);
      process.exit(2);
    }
    if (error instanceof ConfigError) {
      process.stderr.write(`agentwork: config: ${error.message}\n`);
      process.exit(1);
    }
    process.stderr.write(`agentwork: ${(error as Error).message}\n`);
    process.exit(1);
  },
);
