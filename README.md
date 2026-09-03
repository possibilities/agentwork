# agentwork

A reference setup for [agentmux](../agentmux): `bin/tray`, the agent list
that runs in the Tray column. An agentmux instance uses it by naming this
checkout in its config; there is no agentwork command.

## Use

```
~/code/agentwork/scripts/install.sh           # bun install; nothing goes on PATH
cp config.example ~/.config/agentmux/instances/default
agentmux check                                # what the config sets, or what is wrong
agentmux start --attach
```

The config is agentmux's, one file per instance:

```
setup = ~/code/agentwork

prefix = ctrl+space

tray = tray
tray.visible = true
tray-slot = agentmux screen --text slot
tray-slot.visible = false
workspace-pane = agentmux screen --text workspace
workspace-pane.visible = false
right-tray = agentmux screen --text agent
right-tray.visible = false
```

`setup` puts this checkout's `bin/` first on every part app's PATH and
makes it their working directory, so `tray = tray` is `bin/tray` here. Any
program that speaks agentmux's socket can take a part's line instead;
`agentmux screen --text LINE` is agentmux's placeholder as a program. The
part apps find `AGENTMUX_INSTANCE`, `AGENTMUX_SOCKET`, `AGENTMUX_MCP_URL`,
`AGENTMUX_MCP_TOKEN` and `AGENTMUX_THEME` in their environment. agentmux's
README says the rest of the grammar; the operator's file is theirs to keep
(on this machine agentstart stows it), never this repo's.

## The Tray app

`bin/tray` mirrors the instance's agent list: one row per agent, the shown
one filled, in fmx's design and fxnk monochrome. Pressing a row shows that
agent. It never takes focus and reads no keys.
