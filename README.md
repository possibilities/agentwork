# agentwork

A reference setup on top of [agentmux](../agentmux): the Tray app (the Agent
list on the left) and a config file naming which TUI runs on each part.
Anyone can make their own agentmux from TUIs that speak its socket API; this
is the first one.

## Install

```
scripts/install.sh
```

Needs bun, and agentmux installed from the sibling checkout `~/code/agentmux`
first. The install is a symlink to `src/main.ts`, so a `git pull` is an
upgrade.

## Use

```
agentwork start --attach   # start the instance if needed, shape it, attach
agentwork attach           # shape a running instance and attach
agentwork apply            # shape a running instance and return
```

The first run writes `~/.config/agentwork/config`:

```
instance = default

tray = agentwork tray
tray-slot = agentmux screen --text slot
workspace-pane = agentmux screen --text workspace
right-tray = agentmux screen --text agent

tray.visible = true
tray-slot.visible = false
workspace-pane.visible = false
right-tray.visible = false
```

A part's value is a command line, split on whitespace, run in that part's
pane. It finds `AGENTMUX_INSTANCE`, `AGENTMUX_SOCKET`, `AGENTMUX_MCP_URL`,
`AGENTMUX_MCP_TOKEN` and `AGENTMUX_THEME` in its environment, which is all
a TUI needs to join the instance. `agentmux screen --text LINE` is
agentmux's placeholder as a program. An empty value hands the part back to
that placeholder.

Each part also has a `<part>.visible` boolean, applied with the apps: the
tray is shown by default and the other three hidden. Between applies,
agentmux's own verbs (`tray.slot.show`, `workspacePane.show`,
`rightTray.show`, and their `hide`s) change what is on screen, and the
instance remembers that; the next `apply`, `start` or `attach` puts the
config's answer back. The Viewport is not in the config: it shows the
agent, and the no-agents Screen while there is none.

## The Tray app

`agentwork tray` is what agentmux runs in the Tray column: one row per
agent, the shown one filled, in fmx's design and fxnk monochrome. Pressing
a row shows that agent. It never takes focus and reads no keys. Any TUI
that speaks the socket can take its place in the config; nothing else in
agentwork depends on it.
