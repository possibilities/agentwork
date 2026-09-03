# Glossary

agentmux's `CONTEXT.md` defines Instance, Part, App, Tray, Tray slot,
Workspace pane, Right Tray, Viewport, Screen, Agent and the API. This file
adds only what agentwork itself names.

**Tray app** — agentwork's program for agentmux's Tray column: one row per
Agent, fxnk monochrome, the shown Agent filled; a row press is `agent.show`.
Run as `agentwork tray` by agentmux, never by hand. _Avoid_: tray (that is
the column), sidebar, agent list widget.

**Instance config** — `~/.config/agentwork/instances/<name>`, one file per
agentmux Instance, named after it, Ghostty-shaped: one command line per
Part (`tray`, `tray-slot`, `workspace-pane`, `right-tray`), one
`<part>.visible` boolean each (the Tray true and the rest false unless said
otherwise), and agentmux's own keys (`prefix`, `harness.*`, `family.*`),
which agentmux reads from the same file at start. Every Part has its lines;
none is required; an empty command hands the Part back to agentmux's
placeholder. _Avoid_: config (bare), layout file, profile, settings.

**Apply** — putting the Instance config on its Instance: one `set_app` per Part
with a command, `clear_app` for the rest, then `show` or `hide` per Part
as its `.visible` says. Idempotent. _Avoid_: sync, deploy, install.
