import { describe, expect, test } from "bun:test";
import { type BoxRenderable, RGBA, type TextRenderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { fxnkRamp } from "../src/tui/ramp.ts";
import { rowText, stateColor, stateIcon, TrayList, truncate } from "../src/tui/tray-list.ts";

async function createList(width: number, height: number) {
  const setup = await createTestRenderer({ width, height });
  const selected: string[] = [];
  const list = new TrayList(setup.renderer, "dark", (name) => selected.push(name));
  setup.renderer.root.add(list.root);
  return { setup, list, selected };
}

describe("tray rows", () => {
  test("carry state as herdr's dots: one glyph shape, a hue from the terminal's slots", () => {
    expect(stateIcon("blocked")).toBe("●");
    expect(stateIcon("working")).toBe("●");
    expect(stateIcon("done")).toBe("●");
    expect(stateIcon("idle")).toBe("○");
    expect(stateIcon("unknown")).toBe("·");
    for (const state of ["blocked", "working", "done", "idle", "unknown"] as const) {
      expect([...stateIcon(state)]).toHaveLength(1);
    }
    const ramp = fxnkRamp("dark");
    expect(stateColor("blocked", ramp)).toEqual(RGBA.fromIndex(1));
    expect(stateColor("working", ramp)).toEqual(RGBA.fromIndex(3));
    expect(stateColor("done", ramp)).toEqual(RGBA.fromIndex(6));
    expect(stateColor("idle", ramp)).toEqual(RGBA.fromIndex(2));
    expect(stateColor("unknown", ramp)).toEqual(ramp.dim);
  });

  test("truncate only at the right-hand end", () => {
    expect(truncate("abcdef", 6)).toBe("abcdef");
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abcdef", 1)).toBe("…");
    expect(truncate("abcdef", 0)).toBe("");
    expect(
      rowText({ name: "a-very-long-agent-name-indeed", state: "idle", active: false }, 26),
    ).toBe("a-very-long-agent-name…");
  });
});

describe("tray list", () => {
  test("draws one row per agent in its state, fills only the active one, and selects on press", async () => {
    const { setup, list, selected } = await createList(30, 8);
    try {
      list.render(
        [
          { name: "claude-1", state: "blocked", active: false },
          { name: "claude-2", state: "working", active: true },
          { name: "codex-1", state: "done", active: false },
          { name: "codex-2", state: "idle", active: false },
          { name: "sh-1", state: "unknown", active: false },
        ],
        26,
      );
      await setup.renderOnce();
      const frame = setup.captureCharFrame().split("\n");
      expect(frame[0]).toStartWith(" ● claude-1");
      expect(frame[1]).toStartWith(" ● claude-2");
      expect(frame[2]).toStartWith(" ● codex-1");
      expect(frame[3]).toStartWith(" ○ codex-2");
      expect(frame[4]).toStartWith(" · sh-1");

      const inactive = setup.renderer.root.findDescendantById(
        "tray-row-agent-claude-1",
      ) as BoxRenderable;
      const active = setup.renderer.root.findDescendantById(
        "tray-row-agent-claude-2",
      ) as BoxRenderable;
      expect(inactive.backgroundColor).not.toEqual(active.backgroundColor);

      await setup.mockMouse.pressDown(inactive.x + 4, inactive.y);
      expect(selected).toEqual(["claude-1"]);
      const text = setup.renderer.root.findDescendantById(
        "tray-row-text-agent-claude-1",
      ) as TextRenderable;
      expect(text.selectable).toBe(false);
    } finally {
      list.root.destroy();
      setup.renderer.destroy();
    }
  });

  test("the dot alone carries hue; the name stays on the ramp", async () => {
    const { setup, list } = await createList(30, 6);
    try {
      list.render(
        [
          { name: "claude-1", state: "blocked", active: false },
          { name: "claude-2", state: "working", active: true },
        ],
        26,
      );
      await setup.renderOnce();
      const chunks = (id: string) =>
        (
          (setup.renderer.root.findDescendantById(id) as TextRenderable).content as {
            chunks: Array<{ fg?: RGBA }>;
          }
        ).chunks;
      const ramp = fxnkRamp("dark");
      expect(chunks("tray-row-text-agent-claude-1")[0]!.fg).toEqual(RGBA.fromIndex(1));
      expect(chunks("tray-row-text-agent-claude-1")[1]!.fg).toEqual(ramp.dim);
      expect(chunks("tray-row-text-agent-claude-2")[0]!.fg).toEqual(RGBA.fromIndex(3));
      expect(chunks("tray-row-text-agent-claude-2")[1]!.fg).toEqual(ramp.foreground);
    } finally {
      list.root.destroy();
      setup.renderer.destroy();
    }
  });

  test("reuses row renderables across renders", async () => {
    const { setup, list } = await createList(30, 6);
    try {
      list.render([{ name: "claude-1", state: "working", active: true }], 26);
      await setup.renderOnce();
      const before = setup.renderer.root.findDescendantById("tray-row-agent-claude-1");
      for (let pass = 0; pass < 200; pass += 1) {
        list.render(
          [
            { name: "claude-1", state: pass % 2 ? "blocked" : "working", active: true },
            { name: "claude-2", state: "idle", active: false },
          ],
          26,
        );
      }
      await setup.renderOnce();
      const after = setup.renderer.root.findDescendantById("tray-row-agent-claude-1");
      expect(after).toBe(before);
      expect(setup.captureCharFrame().split("\n")[0]).toStartWith(" ● claude-1");
    } finally {
      list.root.destroy();
      setup.renderer.destroy();
    }
  });
});
