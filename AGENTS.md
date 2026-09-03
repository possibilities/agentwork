# agentwork

A reference setup on top of agentmux: the Tray app (the Agent list) and a
config file naming which TUI runs on each agentmux part. agentmux
(`~/code/agentmux`) is the multiplexer, the API, the harnesses and the
placeholder Screen; agentwork only says what runs where, over that API.

## Read first

- `README.md` says what the config looks like and what each command does.
- `CONTEXT.md` is the glossary. agentmux's `CONTEXT.md` is the larger
  glossary this one builds on; a term defined there is not redefined here.
- agentmux's `USAGE.md` is the mental model of the surface underneath.
- The Tray design is fmx's (`~/code/fmx`), fxnk monochrome: a state is a glyph
  and a weight, never a hue. No emoji, no wide glyphs, no connectors, no
  hover, no keyboard. `src/tui/tray-list.ts` is the row painter.

## Layout

```
src/main.ts         CLI: start, attach, apply, tray
src/config.ts       ~/.config/agentwork/config: instance plus a command per part
src/apply.ts        puts the config on an Instance over the socket; the Agent follower
src/tui/tray.ts     the Tray app: mirrors agent.list, a row press is agent.show; hosts the follower
src/tui/tray-list.ts  the row painter
src/tui/ramp.ts     the fxnk ramp, as agentmux's Screen paints it
test/               bun test
```

## Working here

- `bun run check` runs lint (Biome), typecheck and the tests.
- agentmux is a `file:../agentmux` dependency: the sibling checkout, so the
  client and the contract are imported, never copied. A change to agentmux's
  contract is visible here at the next typecheck.
- The Tray app reads `AGENTMUX_SOCKET` and `AGENTMUX_THEME` from the
  environment agentmux gives every part; it never resolves paths itself.
- Which parts are visible is not agentwork's decision: agentmux remembers
  each part's wish and its verbs change it. agentwork sets apps only.
