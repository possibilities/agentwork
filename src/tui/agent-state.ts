import type { AgentStateChanged, AgentsChanged, AgentView } from "agentmux/protocol";

/**
 * What a row shows, fmx's five values from agentmux's four states
 * (`~/code/fmx/src/agent-registry.ts`): an Agent that went idle while the
 * human was looking elsewhere is `done`, finished and unacknowledged, rather
 * than merely `idle`.
 */
export type DisplayState = "blocked" | "working" | "done" | "idle" | "unknown";

/**
 * `seenSince` is the `stateSince` the Agent had when the human last had it in
 * the Viewport. An idle Agent whose state moved on since then finished
 * unwatched, which is what separates `done` from `idle`. fmx counts state
 * versions for this; agentmux stamps each change, so the stamp is the version.
 */
export function displayStateFor(view: AgentView, seenSince: string | null): DisplayState {
  switch (view.state) {
    case "blocked":
      return "blocked";
    case "working":
      return "working";
    case "idle":
      return view.stateSince === seenSince ? "idle" : "done";
    case "unknown":
      return "unknown";
  }
}

export type TrayRow = {
  name: string;
  state: DisplayState;
  active: boolean;
};

/**
 * The Tray app's copy of the Instance: the Agent list as the last full
 * `agents.changed` (or `instance.get`) gave it, each Agent's state as the
 * last `agent.state.changed` moved it, and which state of each Agent the
 * human has seen. Pure: no renderer, no socket.
 */
export class TrayModel {
  private agents: AgentView[] = [];
  private shown: string | null = null;
  private readonly seen = new Map<string, string>();

  /** The whole list at once: `instance.get` at start, `agents.changed` after. */
  replace(changed: AgentsChanged): void {
    this.agents = changed.agents.map((agent) => ({ ...agent }));
    this.shown = changed.shown;
    const names = new Set(this.agents.map((agent) => agent.name));
    for (const name of [...this.seen.keys()]) if (!names.has(name)) this.seen.delete(name);
    this.markShownSeen();
  }

  /** One Agent's state moved; the list is otherwise as it was. */
  stateChanged(change: AgentStateChanged): void {
    const agent = this.agents.find((candidate) => candidate.name === change.name);
    if (!agent) return;
    agent.state = change.state;
    agent.stateSince = change.stateSince;
    agent.stateRule = change.stateRule;
    this.markShownSeen();
  }

  rows(): TrayRow[] {
    return this.agents.map((agent) => ({
      name: agent.name,
      state: displayStateFor(agent, this.seen.get(agent.name) ?? null),
      active: agent.name === this.shown,
    }));
  }

  get isEmpty(): boolean {
    return this.agents.length === 0;
  }

  /** The shown Agent is in front of the human: whatever its state is now, they have seen it. */
  private markShownSeen(): void {
    if (this.shown === null) return;
    const agent = this.agents.find((candidate) => candidate.name === this.shown);
    if (agent) this.seen.set(agent.name, agent.stateSince);
  }
}
