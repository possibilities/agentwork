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
```

A part's value is a command line, split on whitespace, run in that part's
pane. It finds `AGENTMUX_INSTANCE`, `AGENTMUX_SOCKET`, `AGENTMUX_MCP_URL`,
`AGENTMUX_MCP_TOKEN` and `AGENTMUX_THEME` in its environment, which is all
a TUI needs to join the instance. `agentmux screen --text LINE` is
agentmux's placeholder as a program. An empty value hands the part back to
that placeholder.

Whether a part is on screen is agentmux's business, remembered per
instance and changed by its verbs (`tray.slot.show`, `workspacePane.show`,
`rightTray.show`, and their `hide`s); agentwork only says what runs there.
The Viewport is not in the config: it shows the agent, and the no-agents
Screen while there is none.

## The Tray app

`agentwork tray` is what agentmux runs in the Tray column: one row per
agent, the shown one filled, in fmx's design and fxnk monochrome. Pressing
a row shows that agent. It never takes focus and reads no keys. It is also
agentwork's resident presence in the instance: the right Tray is per agent
in agentmux, so the Tray app gives each new agent the config's `right-tray`
command as it appears. A config that replaces the Tray app loses that until
agentmux grows a default right-Tray app.
