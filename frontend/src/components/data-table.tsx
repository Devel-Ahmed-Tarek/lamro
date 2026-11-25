"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { useStore } from "@/lib/store";

export type DataTableSortKind = "alpha" | "date" | "number" | false;

export type DataTableColumn<T> = {
  id: string;
  header: { de: string; en: string } | string;
  sort?: DataTableSortKind;
  /** Value used for sorting / search */
  getValue?: (row: T) => string | number | null | undefined;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

type Props<T> = {
  rows: T[];
  rowKey: (row: T) => string | number;
  columns: DataTableColumn<T>[];
  searchPlaceholder?: { de: string; en: string };
  /** Default sort column id */
  defaultSortId?: string;
  defaultSortDir?: "asc" | "desc";
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void | Promise<void>;
  onBulkDelete?: (rows: T[]) => void | Promise<void>;
  /** Custom label for delete when soft-cancel */
  deleteLabel?: { de: string; en: string };
  bulkDeleteLabel?: { de: string; en: string };
  editLabel?: { de: string; en: string };
  /** Hide action column entirely */
  hideActions?: boolean;
  /** Disable row selection + bulk */
  selectable?: boolean;
  emptyText?: { de: string; en: string };
  getSearchText?: (row: T) => string;
  rowDisabled?: (row: T) => boolean;
  extraActions?: (row: T) => React.ReactNode;
};

function headerText(
  header: { de: string; en: string } | string,
  t: (copy: { de: string; en: string }) => string,
) {
  return typeof header === "string" ? header : t(header);
}

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined, kind: DataTableSortKind, dir: "asc" | "desc") {
  const mul = dir === "asc" ? 1 : -1;
  if (kind === "date") {
    const ta = a ? new Date(String(a)).getTime() : 0;
    const tb = b ? new Date(String(b)).getTime() : 0;
    return (ta - tb) * mul;
  }
  if (kind === "number") {
    const na = Number(a ?? 0);
    const nb = Number(b ?? 0);
    return (na - nb) * mul;
  }
  const sa = String(a ?? "").toLocaleLowerCase("de");
  const sb = String(b ?? "").toLocaleLowerCase("de");
  return sa.localeCompare(sb, "de", { sensitivity: "base" }) * mul;
}

export function DataTable<T>({
  rows,
  rowKey,
  columns,
  searchPlaceholder,
  defaultSortId,
  defaultSortDir = "asc",
  onEdit,
  onDelete,
  onBulkDelete,
  deleteLabel,
  bulkDeleteLabel,
  editLabel,
  hideActions = false,
  selectable = true,
  emptyText,
  getSearchText,
  rowDisabled,
  extraActions,
}: Props<T>) {
  const { t } = useStore();
  const [query, setQuery] = useState("");
  const [sortId, setSortId] = useState<string | null>(defaultSortId ?? columns.find((c) => c.sort)?.id ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDir);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [busy, setBusy] = useState(false);

  const showActions = !hideActions && Boolean(onEdit || onDelete || extraActions);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((row) => {
        if (getSearchText) return getSearchText(row).toLowerCase().includes(q);
        return columns.some((col) => {
          const value = col.getValue ? col.getValue(row) : null;
          return String(value ?? "").toLowerCase().includes(q);
        });
      });
    }

    if (!sortId) return list;
    const col = columns.find((c) => c.id === sortId);
    if (!col?.sort) return list;

    return [...list].sort((a, b) =>
      compareValues(col.getValue?.(a), col.getValue?.(b), col.sort ?? "alpha", sortDir),
    );
  }, [rows, query, sortId, sortDir, columns, getSearchText]);

  const allKeys = filtered.map((row) => rowKey(row));
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selected.has(key));
  const someSelected = allKeys.some((key) => selected.has(key));

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sort) return;
    if (sortId === column.id) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortId(column.id);
    setSortDir(column.sort === "date" ? "desc" : "asc");
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(allKeys));
  }

  function toggleOne(key: string | number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function runBulkDelete() {
    if (!onBulkDelete) return;
    const picked = filtered.filter((row) => selected.has(rowKey(row)) && !rowDisabled?.(row));
    if (picked.length === 0) return;
    const label = t(bulkDeleteLabel ?? { de: "Ausgewählte wirklich löschen?", en: "Delete selected rows?" });
    if (!window.confirm(`${label} (${picked.length})`)) return;
    setBusy(true);
    try {
      await onBulkDelete(picked);
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  async function runDelete(row: T) {
    if (!onDelete) return;
    const label = t(deleteLabel ?? { de: "Wirklich löschen?", en: "Delete this row?" });
    if (!window.confirm(label)) return;
    setBusy(true);
    try {
      await onDelete(row);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(rowKey(row));
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  const sortHint = (column: DataTableColumn<T>) => {
    if (!column.sort || sortId !== column.id) return "";
    if (column.sort === "date") return sortDir === "desc" ? " ↓" : " ↑";
    return sortDir === "asc" ? " A→Z" : " Z→A";
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${fieldClass} max-w-sm`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(searchPlaceholder ?? { de: "Suchen…", en: "Search…" })}
        />
        {selectable && onBulkDelete ? (
          <>
            <Button type="button" size="sm" variant="secondary" disabled={busy || filtered.length === 0} onClick={toggleAll}>
              {allSelected
                ? t({ de: "Auswahl aufheben", en: "Clear selection" })
                : t({ de: "Alle auswählen", en: "Select all" })}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              disabled={busy || !someSelected}
              onClick={() => void runBulkDelete()}
            >
              {t(bulkDeleteLabel ?? { de: "Auswahl löschen", en: "Delete selected" })}
              {someSelected ? ` (${[...selected].filter((key) => allKeys.includes(key)).length})` : ""}
            </Button>
          </>
        ) : null}
        <p className="ml-auto text-xs text-muted">
          {filtered.length}/{rows.length}
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line text-muted">
            <tr>
              {selectable ? (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label={t({ de: "Alle auswählen", en: "Select all" })}
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th key={column.id} className={`px-4 py-3 font-medium ${column.className ?? ""}`}>
                  {column.sort ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-ink"
                      onClick={() => toggleSort(column)}
                    >
                      {headerText(column.header, t)}
                      <span className="text-[10px] text-copper">{sortHint(column)}</span>
                    </button>
                  ) : (
                    headerText(column.header, t)
                  )}
                </th>
              ))}
              {showActions ? (
                <th className="px-4 py-3 font-medium">{t({ de: "Aktionen", en: "Actions" })}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-muted"
                  colSpan={columns.length + (selectable ? 1 : 0) + (showActions ? 1 : 0)}
                >
                  {t(emptyText ?? { de: "Keine Einträge.", en: "No entries." })}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const key = rowKey(row);
                const disabled = rowDisabled?.(row) ?? false;
                return (
                  <tr key={String(key)} className="border-t border-line align-top">
                    {selectable ? (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          disabled={disabled}
                          onChange={() => toggleOne(key)}
                          aria-label={t({ de: "Zeile auswählen", en: "Select row" })}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.id} className={`px-4 py-3 ${column.className ?? ""}`}>
                        {column.cell(row)}
                      </td>
                    ))}
                    {showActions ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {extraActions?.(row)}
                          {onEdit ? (
                            <Button type="button" size="sm" variant="secondary" disabled={busy || disabled} onClick={() => onEdit(row)}>
                              {t(editLabel ?? { de: "Bearbeiten", en: "Edit" })}
                            </Button>
                          ) : null}
                          {onDelete ? (
                            <Button type="button" size="sm" variant="danger" disabled={busy || disabled} onClick={() => void runDelete(row)}>
                              {t(deleteLabel ?? { de: "Löschen", en: "Delete" })}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
