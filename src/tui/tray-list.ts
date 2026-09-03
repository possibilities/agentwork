import {
  BoxRenderable,
  type CliRenderer,
  fg,
  StyledText,
  type TextChunk,
  TextRenderable,
} from "@opentui/core";
import type { AgentStatus } from "agentmux/protocol";
import { fxnkRamp, type Ramp, type Theme } from "./ramp.ts";

/**
 * fmx's Tray row painter (`~/code/fmx/src/session-list.ts`) with the tree
 * flattened: agentmux has one row per Agent and no project or branch rungs.
 * Everything else is kept: glyph plus name, weight and ramp step for state,
 * only the active row filled, selection on mouse-down, rows reused across
 * renders because OpenTUI's handle table is never reclaimed.
 */
export type TrayRow = {
  name: string;
  status: AgentStatus;
  active: boolean;
};

/** Inset the text; the row's shading still spans the full Tray width. */
const ROW_PADDING_LEFT = 1;
const ICON_COLUMN = 2;

/**
 * agentmux knows whether the pane is alive, nothing finer, so a running Agent
 * wears fx's "no classification yet" dot and an exited one the stopped square.
 * Both are single-width BMP glyphs; a wide glyph would shift the column.
 */
export function statusIcon(status: AgentStatus): string {
  switch (status) {
    case "running":
      return "·";
    case "exited":
      return "■";
  }
}

/** Every status agentmux can name recedes; nothing yet earns the foreground step. */
export function statusRole(status: AgentStatus): "dim" {
  switch (status) {
    case "running":
    case "exited":
      return "dim";
  }
}

/** Text is only ever cut at the right-hand end, so an ellipsis never sits mid-line. */
export function truncate(value: string, width: number): string {
  if (width <= 0) return "";
  const characters = [...value];
  if (characters.length <= width) return value;
  if (width === 1) return "…";
  return `${characters.slice(0, width - 1).join("")}…`;
}

export function rowText(row: TrayRow, width: number): string {
  return truncate(row.name, width - ROW_PADDING_LEFT - ICON_COLUMN);
}

type RenderedRow = {
  key: string;
  signature: string;
  container: BoxRenderable;
  text: TextRenderable;
  binding: { name: string };
};

export class TrayList {
  readonly root: BoxRenderable;
  private ramp: Ramp;
  private rows: RenderedRow[] = [];
  private themeGeneration = 0;

  constructor(
    private readonly renderer: CliRenderer,
    theme: Theme,
    private readonly onSelect: (name: string) => void,
  ) {
    this.ramp = fxnkRamp(theme);
    this.root = new BoxRenderable(renderer, {
      id: "tray-list",
      width: "100%",
      height: "100%",
      flexDirection: "column",
    });
  }

  applyTheme(theme: Theme): void {
    this.ramp = fxnkRamp(theme);
    this.themeGeneration += 1;
  }

  render(rows: TrayRow[], width: number): void {
    const keys = rows.map((row) => `agent-${row.name}`);
    const shapeChanged =
      keys.length !== this.rows.length || keys.some((key, index) => this.rows[index]!.key !== key);

    if (!shapeChanged) {
      let repainted = false;
      for (const [index, row] of rows.entries()) {
        repainted = this.paint(this.rows[index]!, row, width) || repainted;
      }
      if (repainted) this.renderer.requestRender();
      return;
    }

    const reusable = new Map(this.rows.map((rendered) => [rendered.key, rendered]));
    const next: RenderedRow[] = [];
    for (const [index, row] of rows.entries()) {
      const key = keys[index]!;
      const existing = reusable.get(key);
      if (existing) {
        reusable.delete(key);
        this.paint(existing, row, width);
        next.push(existing);
      } else {
        next.push(this.buildRow(row, key, width));
      }
    }
    for (const rendered of this.rows) this.root.remove(rendered.container);
    for (const orphan of reusable.values()) orphan.container.destroyRecursively();
    this.rows = next;
    for (const rendered of this.rows) this.root.add(rendered.container);
    this.renderer.requestRender();
  }

  private paint(rendered: RenderedRow, row: TrayRow, width: number): boolean {
    const signature = this.signatureOf(row, width);
    if (rendered.signature === signature) return false;
    rendered.signature = signature;
    rendered.binding.name = row.name;
    rendered.container.backgroundColor = row.active ? this.ramp.surface : undefined;
    rendered.text.content = this.styleRow(row, width);
    return true;
  }

  private signatureOf(row: TrayRow, width: number): string {
    return [width, this.themeGeneration, row.status, row.active, row.name].join(" ");
  }

  private buildRow(row: TrayRow, key: string, width: number): RenderedRow {
    const binding = { name: row.name };
    const container = new BoxRenderable(this.renderer, {
      id: `tray-row-${key}`,
      width: "100%",
      height: 1,
      flexShrink: 0,
      paddingLeft: ROW_PADDING_LEFT,
      // Only the active row is filled; nothing else in the Tray has a background.
      ...(row.active ? { backgroundColor: this.ramp.surface } : {}),
      onMouseDown: (event) => {
        // Navigation is a press action, like a keybinding: waiting for release
        // makes a fast switch feel delayed by the human's click duration.
        event.preventDefault();
        event.stopPropagation();
        this.onSelect(binding.name);
      },
      onMouseUp: (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
    });
    const text = new TextRenderable(this.renderer, {
      id: `tray-row-text-${key}`,
      content: this.styleRow(row, width),
      // Selection delays navigation until mouse-up, and replacing a row while
      // OpenTUI holds a selection leaves it holding a destroyed renderable.
      selectable: false,
    });
    container.add(text);
    return { key, signature: this.signatureOf(row, width), container, text, binding };
  }

  private styleRow(row: TrayRow, width: number): StyledText {
    const ramp = this.ramp;
    const chunks: TextChunk[] = [
      fg(ramp[statusRole(row.status)])(`${statusIcon(row.status)} `),
      // The selected row's name steps up to the primary: dim text on the raised
      // fill is the one place the Tray asks a name to be read against something
      // other than the background it was measured from.
      fg(row.active ? ramp.foreground : ramp.dim)(rowText(row, width)),
    ];
    return new StyledText(chunks);
  }
}
