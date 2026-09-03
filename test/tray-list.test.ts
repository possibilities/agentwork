import { describe, expect, test } from "bun:test";
import type { BoxRenderable, TextRenderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { rowText, stateIcon, stateRole, TrayList, truncate } from "../src/tui/tray-list.ts";

async function createList(width: number, height: number) {
  const setup = await createTestRenderer({ width, height });
  const selected: string[] = [];
  const list = new TrayList(setup.renderer, "dark", (name) => selected.push(name));
  setup.renderer.root.add(list.root);
  return { setup, list, selected };
}

describe("tray rows", () => {
  test("carry state as fmx's single-width glyph in a ramp step, never a hue", () => {
    expect(stateIcon("blocked")).toBe("×");
    expect(stateIcon("working")).toBe("◐");
    expect(stateIcon("done")).toBe("✓");
    expect(stateIcon("idle")).toBe("○");
    expect(stateIcon("unknown")).toBe("·");
    for (const state of ["blocked", "working", "done", "idle", "unknown"] as const) {
      expect([...stateIcon(state)]).toHaveLength(1);
    }
    expect(stateRole("blocked")).toBe("foreground");
    expect(stateRole("done")).toBe("accent");
    expect(stateRole("working")).toBe("dim");
    expect(stateRole("idle")).toBe("dim");
    expect(stateRole("unknown")).toBe("dim");
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
      expect(frame[0]).toStartWith(" × claude-1");
      expect(frame[1]).toStartWith(" ◐ claude-2");
      expect(frame[2]).toStartWith(" ✓ codex-1");
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

  test("a blocked row's glyph is the only bold thing, in the foreground step", async () => {
    const { setup, list } = await createList(30, 6);
    try {
      list.render(
        [
          { name: "claude-1", state: "blocked", active: false },
          { name: "claude-2", state: "working", active: false },
        ],
        26,
      );
      await setup.renderOnce();
      const blocked = setup.renderer.root.findDescendantById(
        "tray-row-text-agent-claude-1",
      ) as TextRenderable;
      const working = setup.renderer.root.findDescendantById(
        "tray-row-text-agent-claude-2",
      ) as TextRenderable;
      const chunk = (text: TextRenderable) => (text.content as { chunks: unknown[] }).chunks[0];
      expect(JSON.stringify(chunk(blocked))).toContain('"attributes":1');
      expect(JSON.stringify(chunk(working))).not.toContain('"attributes":1');
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
      expect(setup.captureCharFrame().split("\n")[0]).toStartWith(" × claude-1");
    } finally {
      list.root.destroy();
      setup.renderer.destroy();
    }
  });
});
