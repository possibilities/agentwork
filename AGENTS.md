# agentwork

A reference agentmux Setup: `bin/tray`, the agent list, for the left panel.
An agentmux instance uses it by saying `setup = ~/code/agentwork`
and `command: tray` under `panels.left` in its config; agentmux (`~/code/agentmux`) is the
multiplexer, the API, the CLI, the config grammar and the placeholder
Screen. agentwork ships programs, never the operator's config.

## Read first

- `README.md` says how an instance config names this setup.
- `CONTEXT.md` is the glossary; agentmux's is the larger one it builds on.
- agentmux's `USAGE.md` is the mental model of the surface underneath, and
  its `README.md` has the config grammar.
- The Tray design is smolmux's (`~/code/smolmux`), fxnk monochrome, with one
  deliberate exception: the state mark is herdr's "dots" (`●` `○` `·`, hue
  by state from the terminal's ANSI slots), because smolmux's shapes are not in
  the operator's font and fall back at mismatched sizes. No emoji, no wide
  glyphs, no connectors, no hover, no keyboard. `src/tui/tray-list.ts` is
  the row painter.

## Layout

```
bin/tray              the left panel app's entry: reads AGENTMUX_SOCKET and AGENTMUX_THEME
config.example.yaml   an instance config using this setup, to copy
src/tui/tray.ts       the left panel app: mirrors agent.list and each state change, a row press is agent.show
src/tui/agent-state.ts  the model: smolmux's five display states from agentmux's four, and what the human has seen
src/tui/tray-list.ts  the row painter
src/tui/ramp.ts       the fxnk ramp, as agentmux's Screen paints it
test/                 bun test
```

## Working here

- `bun run check` runs lint (Biome), typecheck and the tests.
- agentmux is a `file:../agentmux` dependency: the sibling checkout, so the
  client and the contract are imported, never copied.
- There is no CLI here and nothing goes on PATH. `scripts/install.sh` only
  makes the checkout runnable. Everything else is `agentmux`.
