# Glossary

agentmux's `CONTEXT.md` defines Instance, Part, App, Tray, Tray slot,
Workspace pane, Right Tray, Viewport, Screen, Agent and the API. This file
adds only what agentwork itself names.

**Tray app** — agentwork's program for agentmux's Tray column: one row per
Agent, fxnk monochrome, the shown Agent filled; a row press is `agent.show`.
Run as `agentwork tray` by agentmux, never by hand. _Avoid_: tray (that is
the column), sidebar, agent list widget.

**Config** — `~/.config/agentwork/config`, Ghostty-shaped: `instance`, one
command line per Part (`tray`, `tray-slot`, `workspace-pane`,
`right-tray`), and one `<part>.visible` boolean each, the Tray true and
the rest false unless said otherwise. Every Part has its lines; none is
required; an empty command hands the Part back to agentmux's placeholder.
_Avoid_: layout file, profile, settings.

**Apply** — putting the Config on an Instance: one `set_app` per Part
with a command, `clear_app` for the rest, then `show` or `hide` per Part
as its `.visible` says. Idempotent. _Avoid_: sync, deploy, install.
