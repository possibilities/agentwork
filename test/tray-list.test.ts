import { describe, expect, test } from "bun:test";
import type { BoxRenderable, TextRenderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";
import { rowText, statusIcon, statusRole, TrayList, truncate } from "../src/tui/tray-list.ts";

async function createList(width: number, height: number) {
  const setup = await createTestRenderer({ width, height });
  const selected: string[] = [];
  const list = new TrayList(setup.renderer, "dark", (name) => selected.push(name));
  setup.renderer.root.add(list.root);
  return { setup, list, selected };
}

describe("tray rows", () => {
  test("carry state as a single-width glyph in a ramp step, never a hue", () => {
    expect(statusIcon("running")).toBe("·");
    expect(statusIcon("exited")).toBe("■");
    expect(statusRole("running")).toBe("dim");
    expect(statusRole("exited")).toBe("dim");
  });

  test("truncate only at the right-hand end", () => {
    expect(truncate("abcdef", 6)).toBe("abcdef");
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abcdef", 1)).toBe("…");
    expect(truncate("abcdef", 0)).toBe("");
    expect(
      rowText({ name: "a-very-long-agent-name-indeed", status: "running", active: false }, 26),
    ).toBe("a-very-long-agent-name…");
  });
});

describe("tray list", () => {
  test("draws one row per agent, fills only the active one, and selects on press", async () => {
    const { setup, list, selected } = await createList(30, 6);
    try {
      list.render(
        [
          { name: "claude-1", status: "exited", active: false },
          { name: "claude-2", status: "running", active: true },
        ],
        26,
      );
      await setup.renderOnce();
      const frame = setup.captureCharFrame().split("\n");
      expect(frame[0]).toStartWith(" ■ claude-1");
      expect(frame[1]).toStartWith(" · claude-2");

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

  test("reuses row renderables across renders", async () => {
    const { setup, list } = await createList(30, 6);
    try {
      list.render([{ name: "claude-1", status: "running", active: true }], 26);
      await setup.renderOnce();
      const before = setup.renderer.root.findDescendantById("tray-row-agent-claude-1");
      for (let pass = 0; pass < 200; pass += 1) {
        list.render(
          [
            { name: "claude-1", status: pass % 2 ? "exited" : "running", active: true },
            { name: "claude-2", status: "running", active: false },
          ],
          26,
        );
      }
      await setup.renderOnce();
      const after = setup.renderer.root.findDescendantById("tray-row-agent-claude-1");
      expect(after).toBe(before);
      expect(setup.captureCharFrame().split("\n")[0]).toStartWith(" ■ claude-1");
    } finally {
      list.root.destroy();
      setup.renderer.destroy();
    }
  });
});
