import { homedir } from "node:os";
import { join } from "node:path";
import {
  ConfigError as AgentmuxConfigError,
  parseConfig as parseAgentmuxConfig,
} from "agentmux/config";

/**
 * `~/.config/agentwork/instances/<name>`: one file per agentmux Instance,
 * Ghostty-shaped: one `key = value` per line, `#` lines are comments, later
 * lines win. A part's value is a command line split on whitespace, run in
 * that part's pane; an empty value forgets the part, so agentmux shows its
 * placeholder there. `<part>.visible` says whether the part is on screen
 * once the config is applied.
 *
 * The same file is agentmux's config for the Instance: `agentwork start`
 * hands it to `agentmux start --config`, so agentmux's own keys (`prefix`,
 * `harness.<name>.<field>`, `family.<name>.<field>`) live here too. agentwork
 * passes them through without reading them, and agentmux ignores agentwork's.
 */
export const PARTS = ["tray", "tray-slot", "workspace-pane", "right-tray"] as const;
export type Part = (typeof PARTS)[number];

export type Config = {
  /** argv per part; absent means leave the part to agentmux's placeholder. */
  parts: Partial<Record<Part, string[]>>;
  /** Whether each part is on screen once the config is applied. */
  visible: Record<Part, boolean>;
};

export const DEFAULT_CONFIG: Config = {
  parts: {
    tray: ["agentwork", "tray"],
    "tray-slot": ["agentmux", "screen", "--text", "slot"],
    "workspace-pane": ["agentmux", "screen", "--text", "workspace"],
    "right-tray": ["agentmux", "screen", "--text", "agent"],
  },
  visible: { tray: true, "tray-slot": false, "workspace-pane": false, "right-tray": false },
};

/** The default config, as the file agentwork writes when there is none; README.md explains the keys. */
export const DEFAULT_CONFIG_TEXT = `tray = agentwork tray
tray-slot = agentmux screen --text slot
workspace-pane = agentmux screen --text workspace
right-tray = agentmux screen --text agent

tray.visible = true
tray-slot.visible = false
workspace-pane.visible = false
right-tray.visible = false
`;

export class ConfigError extends Error {}

export const DEFAULT_INSTANCE = "default";
const INSTANCE_NAME = /^[a-z][a-z0-9_-]{0,31}$/;

/** The config for one Instance, by name. */
export function instanceConfigPath(instance: string): string {
  if (!INSTANCE_NAME.test(instance)) {
    throw new ConfigError(`instance "${instance}" is not a valid name`);
  }
  const base = process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config");
  return join(base, "agentwork", "instances", instance);
}

/** agentmux's own keys; they stay in the file for agentmux, unread here. */
function isAgentmuxKey(key: string): boolean {
  return key === "prefix" || key.startsWith("harness.") || key.startsWith("family.");
}

export function parseConfig(text: string, base: Config = DEFAULT_CONFIG): Config {
  // agentmux's keys are passed through unread, but not unchecked: a bad
  // harness field or prefix chord fails here, at apply, not at the next start.
  try {
    parseAgentmuxConfig(text);
  } catch (error) {
    if (error instanceof AgentmuxConfigError) {
      throw new ConfigError(`line ${error.line}: ${error.message}`);
    }
    throw error;
  }
  const config: Config = { parts: { ...base.parts }, visible: { ...base.visible } };
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]!;
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 0) throw new ConfigError(`line ${index + 1}: expected key = value`);
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    if (isAgentmuxKey(key)) continue;
    if (key === "instance") {
      throw new ConfigError(
        `line ${index + 1}: "instance" is not a key; the file's name is the instance`,
      );
    }
    if ((PARTS as readonly string[]).includes(key)) {
      const part = key as Part;
      if (value.length === 0) delete config.parts[part];
      else config.parts[part] = value.split(/\s+/);
    } else if (
      key.endsWith(".visible") &&
      (PARTS as readonly string[]).includes(key.slice(0, -8))
    ) {
      const part = key.slice(0, -8) as Part;
      if (value === "true") config.visible[part] = true;
      else if (value === "false") config.visible[part] = false;
      else throw new ConfigError(`line ${index + 1}: ${key} must be true or false`);
    } else {
      throw new ConfigError(`line ${index + 1}: unknown key "${key}"`);
    }
  }
  return config;
}

export async function loadConfig(path: string): Promise<Config> {
  const file = Bun.file(path);
  if (!(await file.exists())) return DEFAULT_CONFIG;
  return parseConfig(await file.text());
}
