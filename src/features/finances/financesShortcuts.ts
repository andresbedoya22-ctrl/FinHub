export type FinancesCommand =
  | "commandPalette"
  | "createTransaction"
  | "editTransaction"
  | "approveTransaction"
  | "openDates"
  | "toggleForecastMode";

export interface ShortcutDef {
  keys: string;          // display string, e.g. "Ctrl+K"
  key: string;           // raw key, e.g. "k"
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  command: FinancesCommand;
  label: string;
}

export const FINANCES_SHORTCUTS: ShortcutDef[] = [
  { keys: "Ctrl/Cmd+K", key: "k", meta: true, ctrl: true, command: "commandPalette", label: "Navegación rápida / Command Palette" },
  { keys: "C",         key: "c", command: "createTransaction",   label: "Nuevo gasto/ingreso (modal)" },
  { keys: "E",         key: "e", command: "editTransaction",     label: "Editar transacción (categoría)" },
  { keys: "A",         key: "a", command: "approveTransaction",  label: "Aprobar transacción" },
  { keys: "D",         key: "d", command: "openDates",           label: "Filtro de fechas (mes)" },
  { keys: "F",         key: "f", command: "toggleForecastMode",  label: "Toggle Forecast Mode" },
];

export function matchesShortcut(e: KeyboardEvent, def: ShortcutDef): boolean {
  const key = (e.key || "").toLowerCase();
  if (key !== def.key) return false;

  const metaOrCtrlOk = def.meta || def.ctrl ? (e.metaKey || e.ctrlKey) : true;
  if (!metaOrCtrlOk) return false;

  if (def.shift && !e.shiftKey) return false;
  if (def.alt && !e.altKey) return false;

  // If def does not require shift/alt, we allow them but UI may choose to block later.
  return true;
}