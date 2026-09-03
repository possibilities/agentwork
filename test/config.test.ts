import { describe, expect, test } from "bun:test";
import {
  ConfigError,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_TEXT,
  instanceConfigPath,
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
      tray = my-tray --dense
      tray =   other   tray
      right-tray =
    `);
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

  test("passes agentmux's keys through and rejects the rest", () => {
    const config = parseConfig(
      "prefix = ctrl+space\nharness.claude.default-model = opus-1m\nfamily.gpt.effort = high\n",
    );
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(() => parseConfig("viewport = vim")).toThrow(ConfigError);
    expect(() => parseConfig("prefx = ctrl+a")).toThrow(/unknown key "prefx"/);
    // Inside agentmux's namespaces, agentmux's parser judges, here and now.
    expect(() => parseConfig("tray = x\nharness.claude.colour = red")).toThrow(
      /line 2: unknown harness field/,
    );
    expect(() => parseConfig("prefix = hyper+b")).toThrow(/line 1: .*modifier/);
    expect(() => parseConfig("instance = work")).toThrow(/file's name is the instance/);
    expect(() => parseConfig("tray")).toThrow(/line 1/);
  });

  test("an instance's config is named after it", () => {
    process.env["XDG_CONFIG_HOME"] = "/x";
    expect(instanceConfigPath("default")).toBe("/x/agentwork/instances/default");
    expect(instanceConfigPath("work-2")).toBe("/x/agentwork/instances/work-2");
    expect(() => instanceConfigPath("Not Valid")).toThrow(ConfigError);
  });
});
