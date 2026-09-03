# Glossary

agentmux's `CONTEXT.md` defines Instance, Config, Setup, Part, App, Tray,
Viewport, Screen, Agent and the API. This file adds only what agentwork
itself names.

**Tray app** — `bin/tray`, agentwork's program for agentmux's Tray column:
one row per Agent carrying its state glyph and its name, fxnk monochrome,
the shown Agent filled; a row press is `agent.show`. It hears
`agents.changed` for the list and `agent.state.changed` for one Agent's
state. Run by agentmux, never by hand. _Avoid_: tray (that is the
column), agentwork (that is the Setup), sidebar, agent list widget.

**Display state** — what a row shows, fmx's five values from agentmux's
four: `blocked` (`×`, bold, foreground), `working` (`◐`), `done` (`✓`,
accent), `idle` (`○`), `unknown` (`·`); an exited Agent reads `unknown`.
The glyph says what, the ramp step and weight say how loudly, never a hue.
_Avoid_: status, icon state, agent status.

**Seen** — whether the human has had an Agent in the Viewport since its
state last changed, tracked as the `stateSince` stamp the Agent had when it
was last shown. An idle Agent that is not seen is **done**: finished and
unacknowledged, which is the only difference between `✓` and `○`. fmx's
word, and fmx's rule. _Avoid_: read, acknowledged, unread.
