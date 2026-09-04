# Glossary

agentmux's `CONTEXT.md` defines Instance, Config, Setup, Panel, App, the
left panel, the agents panel, Screen, Agent and the API. This file adds only what agentwork
itself names.

**Tray app** — `bin/tray`, agentwork's program for agentmux's left panel:
one row per Agent carrying its state glyph and its name, fxnk monochrome,
the shown Agent filled; a row press is `agent.show`. It hears
`agents.changed` for the list and `agent.state.changed` for one Agent's
state. Run by agentmux, never by hand. _Avoid_: tray (that is the
column), agentwork (that is the Setup), sidebar, agent list widget.

**Display state** — what a row shows, fmx's five values from agentmux's
four, marked the way herdr's default "dots" style marks them: a filled dot
`●` for `blocked` (red), `working` (yellow) and `done` (teal), a ring `○`
for `idle` (green), a middle dot `·` for `unknown` (the ramp's dim step). The hues are the terminal's ANSI slots.
The dot is the one place the left panel spends hue on state: fmx's shapes fall
back to mismatched fonts on the operator's terminal. _Avoid_: status, icon
state, agent status.

**Seen** — whether the human has had an Agent in the agents panel since its
state last changed, tracked as the `stateSince` stamp the Agent had when it
was last shown. An idle Agent that is not seen is **done**: finished and
unacknowledged, which is the only difference between `✓` and `○`. fmx's
word, and fmx's rule. _Avoid_: read, acknowledged, unread.
