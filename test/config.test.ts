import { describe, expect, test } from "bun:test";
import {
  ConfigError,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_TEXT,
  PARTS,
  parseConfig,
} from "../src/config.ts";

describe("the config names a command for each part", () => {
  test("the shipped default text parses to the default config", () => {
    expect(parseConfig(DEFAULT_CONFIG_TEXT)).toEqual(DEFAULT_CONFIG);
    for (const part of PARTS) expect(DEFAULT_CONFIG.parts[part]).toBeDefined();
  });

  test("later lines win, an empty value forgets a part, whitespace splits argv", () => {
    const config = parseConfig(`
      instance = work
      tray = my-tray --dense
      tray =   other   tray
      right-tray =
    `);
    expect(config.instance).toBe("work");
    expect(config.parts.tray).toEqual(["other", "tray"]);
    expect(config.parts["right-tray"]).toBeUndefined();
    expect(config.parts["tray-slot"]).toEqual(DEFAULT_CONFIG.parts["tray-slot"]);
  });

  test("a part's .visible is a boolean; the tray alone is shown by default", () => {
    expect(DEFAULT_CONFIG.visible).toEqual({
      tray: true,
      "tray-slot": false,
      "workspace-pane": false,
      "right-tray": false,
    });
    const config = parseConfig("right-tray.visible = true\ntray.visible = false");
    expect(config.visible["right-tray"]).toBe(true);
    expect(config.visible.tray).toBe(false);
    expect(() => parseConfig("tray.visible = yes")).toThrow(/true or false/);
    expect(() => parseConfig("viewport.visible = true")).toThrow(ConfigError);
  });

  test("rejects unknown keys, bad instance names and lines without =", () => {
    expect(() => parseConfig("viewport = vim")).toThrow(ConfigError);
    expect(() => parseConfig("instance = Not Valid")).toThrow(ConfigError);
    expect(() => parseConfig("tray")).toThrow(/line 1/);
  });
});
