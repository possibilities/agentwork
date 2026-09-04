import { describe, expect, test } from "bun:test";
import type { AgentView } from "agentmux/protocol";
import { displayStateFor, TrayModel } from "../src/tui/agent-state.ts";

function view(overrides: Partial<AgentView> = {}): AgentView {
  return {
    name: "claude-1",
    harness: "claude",
    model: "opus-1m",
    effort: "medium",
    codex: null,
    state: "unknown",
    stateSince: "2026-09-03T10:00:00.000Z",
    stateRule: null,
    cwd: "/work",
    worktree: null,
    command: ["claude"],
    paneId: "%1",
    pid: 1,
    startedAt: "2026-09-03T10:00:00.000Z",
    ...overrides,
  };
}

const T1 = "2026-09-03T10:00:01.000Z";
const T2 = "2026-09-03T10:00:02.000Z";

describe("displayStateFor", () => {
  test("is fmx's five values from agentmux's four, done being idle unseen", () => {
    expect(displayStateFor(view({ state: "blocked", stateSince: T1 }), null)).toBe("blocked");
    expect(displayStateFor(view({ state: "working", stateSince: T1 }), null)).toBe("working");
    expect(displayStateFor(view({ state: "unknown" }), null)).toBe("unknown");
    expect(displayStateFor(view({ state: "idle", stateSince: T1 }), null)).toBe("done");
    expect(displayStateFor(view({ state: "idle", stateSince: T1 }), T1)).toBe("idle");
    expect(displayStateFor(view({ state: "idle", stateSince: T2 }), T1)).toBe("done");
  });

});

describe("TrayModel", () => {
  test("rows follow the list, the shown agent is active, and it is seen as it is", () => {
    const model = new TrayModel();
    expect(model.isEmpty).toBe(true);
    model.replace({
      agents: [view({ name: "a", state: "idle", stateSince: T1 }), view({ name: "b" })],
      shown: "a",
    });
    expect(model.isEmpty).toBe(false);
    expect(model.rows()).toEqual([
      { name: "a", state: "idle", active: true },
      { name: "b", state: "unknown", active: false },
    ]);
  });

  test("an agent that goes idle while hidden is done until it is shown", () => {
    const model = new TrayModel();
    model.replace({ agents: [view({ name: "a" }), view({ name: "b" })], shown: "a" });
    model.stateChanged({ name: "b", state: "working", stateSince: T1, stateRule: "r" });
    expect(model.rows()[1]).toEqual({ name: "b", state: "working", active: false });
    model.stateChanged({ name: "b", state: "idle", stateSince: T2, stateRule: "r" });
    expect(model.rows()[1]).toEqual({ name: "b", state: "done", active: false });
    // Showing it acknowledges the state it has now.
    model.replace({
      agents: [view({ name: "a" }), view({ name: "b", state: "idle", stateSince: T2 })],
      shown: "b",
    });
    expect(model.rows()[1]).toEqual({ name: "b", state: "idle", active: true });
    // Looking away keeps it idle; a later idle with a new stamp is done again.
    model.replace({
      agents: [view({ name: "a" }), view({ name: "b", state: "idle", stateSince: T2 })],
      shown: "a",
    });
    expect(model.rows()[1]!.state).toBe("idle");
    model.stateChanged({ name: "b", state: "working", stateSince: T2, stateRule: "r" });
    model.stateChanged({
      name: "b",
      state: "idle",
      stateSince: "2026-09-03T10:00:03.000Z",
      stateRule: "r",
    });
    expect(model.rows()[1]!.state).toBe("done");
  });

  test("an agent that goes idle while shown is idle, not done", () => {
    const model = new TrayModel();
    model.replace({ agents: [view({ name: "a" })], shown: "a" });
    model.stateChanged({ name: "a", state: "working", stateSince: T1, stateRule: "r" });
    model.stateChanged({ name: "a", state: "idle", stateSince: T2, stateRule: "r" });
    expect(model.rows()).toEqual([{ name: "a", state: "idle", active: true }]);
  });

  test("blocked is blocked whether or not it has been seen", () => {
    const model = new TrayModel();
    model.replace({ agents: [view({ name: "a" }), view({ name: "b" })], shown: "a" });
    model.stateChanged({ name: "a", state: "blocked", stateSince: T1, stateRule: "r" });
    model.stateChanged({ name: "b", state: "blocked", stateSince: T1, stateRule: "r" });
    expect(model.rows().map((row) => row.state)).toEqual(["blocked", "blocked"]);
  });

  test("a change for an agent the list does not hold is dropped, and a removed agent is forgotten", () => {
    const model = new TrayModel();
    model.replace({ agents: [view({ name: "a" })], shown: "a" });
    model.stateChanged({ name: "ghost", state: "blocked", stateSince: T1, stateRule: "r" });
    expect(model.rows()).toHaveLength(1);
    model.replace({ agents: [], shown: null });
    expect(model.rows()).toEqual([]);
    expect(model.isEmpty).toBe(true);
    // Back with the same name and a fresh idle: nothing remembered marks it seen.
    model.replace({ agents: [view({ name: "a", state: "idle", stateSince: T1 })], shown: null });
    expect(model.rows()[0]!.state).toBe("done");
  });
});
