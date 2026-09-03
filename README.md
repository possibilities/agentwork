# agentwork

A reference setup for [agentmux](../agentmux): `bin/tray`, the agent list
that runs in the left panel. An agentmux instance uses it by naming this
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

left.command = tray
left.description = The agent list
left.needs-agents = true
left.visible = true
left.width = 26

drawer.command = agentmux screen --text drawer
drawer.visible = false
drawer.height = 8

dock.command = agentmux screen --text dock
dock.visible = false
dock.width = 40

right.command = agentmux screen --text right
right.visible = false
right.width = 40
```

`setup` puts this checkout's `bin/` first on every panel app's PATH and
makes it their working directory, so `left.command = tray` is `bin/tray`
here. The panels are the left panel, the left drawer under it, the dock panel
between the left panel and the agents panel, and the right panel. Any program that speaks
agentmux's socket can take a panel's `command` instead;
`agentmux screen --text LINE` is agentmux's placeholder as a program.
`<panel>.visible` and the sizes seed the first start only; the instance
remembers them after. The
panel apps find `AGENTMUX_INSTANCE`, `AGENTMUX_SOCKET`, `AGENTMUX_MCP_URL`,
`AGENTMUX_MCP_TOKEN` and `AGENTMUX_THEME` in their environment. agentmux's
README says the rest of the grammar; the operator's file is theirs to keep
(on this machine agentstart stows it), never this repo's.

## The Tray app

`bin/tray` mirrors the instance's agent list: one row per agent, the shown
one filled, in fmx's design and fxnk monochrome. Pressing a row shows that
agent. It never takes focus and reads no keys.
