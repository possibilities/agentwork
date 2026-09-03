# Glossary

agentmux's `CONTEXT.md` defines Instance, Part, App, Tray, Tray slot,
Workspace pane, Right Tray, Viewport, Screen, Agent and the API. This file
adds only what agentwork itself names.

**Tray app** — agentwork's program for agentmux's Tray column: one row per
Agent, fxnk monochrome, the shown Agent filled; a row press is `agent.show`.
Run as `agentwork tray` by agentmux, never by hand. _Avoid_: tray (that is
the column), sidebar, agent list widget.

**Config** — `~/.config/agentwork/config`, Ghostty-shaped: `instance`, and
one command line per Part (`tray`, `tray-slot`, `workspace-pane`,
`right-tray`). Every Part has a line; none is required; an empty value hands
the Part back to agentmux's placeholder. Visibility is not in it. _Avoid_:
layout file, profile, settings.

**Apply** — putting the Config on an Instance: one `set_app` per Part
with a command, `clear_app` for the rest. Idempotent. _Avoid_: sync,
deploy, install.
