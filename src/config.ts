import { homedir } from "node:os";
import { join } from "node:path";

/**
 * `~/.config/agentwork/config`, Ghostty-shaped like agentmux's own: one
 * `key = value` per line, `#` lines are comments, later lines win. A part's
 * value is a command line split on whitespace, run in that part's pane; an
 * empty value forgets the part, so agentmux shows its placeholder there.
 *
 * Every part has a line so the file says what runs everywhere, but none is
 * required. Which parts are visible is not configured: agentmux remembers
 * each part's wish and its verbs change it.
 */
export const PARTS = ["tray", "tray-slot", "workspace-pane", "right-tray"] as const;
export type Part = (typeof PARTS)[number];

export type Config = {
  /** The agentmux instance to shape and attach to. */
  instance: string;
  /** argv per part; absent means leave the part to agentmux's placeholder. */
  parts: Partial<Record<Part, string[]>>;
};

export const DEFAULT_CONFIG: Config = {
  instance: "default",
  parts: {
    tray: ["agentwork", "tray"],
    "tray-slot": ["agentmux", "screen", "--text", "slot"],
    "workspace-pane": ["agentmux", "screen", "--text", "workspace"],
    "right-tray": ["agentmux", "screen", "--text", "agent"],
  },
};

/** The default config, as the file agentwork writes when there is none; README.md explains the keys. */
export const DEFAULT_CONFIG_TEXT = `instance = default

tray = agentwork tray
tray-slot = agentmux screen --text slot
workspace-pane = agentmux screen --text workspace
right-tray = agentmux screen --text agent
`;

export class ConfigError extends Error {}

export function defaultConfigPath(): string {
  const base = process.env["XDG_CONFIG_HOME"] || join(homedir(), ".config");
  return join(base, "agentwork", "config");
}

export function parseConfig(text: string, base: Config = DEFAULT_CONFIG): Config {
  const config: Config = { instance: base.instance, parts: { ...base.parts } };
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]!;
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 0) throw new ConfigError(`line ${index + 1}: expected key = value`);
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    if (key === "instance") {
      if (!/^[a-z][a-z0-9_-]{0,31}$/.test(value)) {
        throw new ConfigError(`line ${index + 1}: instance "${value}" is not a valid name`);
      }
      config.instance = value;
    } else if ((PARTS as readonly string[]).includes(key)) {
      const part = key as Part;
      if (value.length === 0) delete config.parts[part];
      else config.parts[part] = value.split(/\s+/);
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
