"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { KeyRound, Table2 } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type { ColumnResponse } from "@/lib/types";

const HEADER_HEIGHT = 40;
const HEADER_DIVIDER_HEIGHT = 2;
const ROW_HEIGHT = 34;
const HANDLE_SIZE = 12;
const HANDLE_OFFSET = HANDLE_SIZE / 2;

export interface TableNodeData extends Record<string, unknown> {
  tableId: string;
  schemaName: string;
  tableName: string;
  displayName: string;
  colorHex: string;
  columns: ColumnResponse[];
  relatedColumnIds: string[];
  dataTypeOptions: string[];
  onRenameTable?: (tableId: string, nextDisplayName: string) => void;
  onRenameColumn?: (
    tableId: string,
    columnId: string,
    nextColumnName: string,
  ) => void;
  onChangeColumnType?: (
    tableId: string,
    columnId: string,
    nextTypeName: string,
  ) => void;
}

export type TableNodeType = Node<TableNodeData, "tableNode">;

type EditingState =
  | { kind: "table" }
  | { kind: "columnName"; columnId: string }
  | { kind: "columnType"; columnId: string };

function getColumnTypeName(
  column: Pick<ColumnResponse, "data_type" | "udt_name">,
) {
  const dataType = column.data_type.trim();
  const isUserDefined = dataType.replace("[]", "") === "USER-DEFINED";
  if (isUserDefined && column.udt_name) {
    return `${column.udt_name}${dataType.endsWith("[]") ? "[]" : ""}`;
  }
  return dataType;
}

function renderTypeLabel(column: ColumnResponse) {
  const typeLabel = getColumnTypeName(column);
  return `${typeLabel}${column.is_nullable ? "?" : ""}`;
}

function withOpacity(hexColor: string, alphaHex: string) {
  const value = hexColor.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(value)) {
    return `${value}${alphaHex}`;
  }
  return value;
}

export function TableNode({ data, selected }: NodeProps<TableNodeType>) {
  const headerColor = data.colorHex || "#6dd3b9";
  const relatedColumnSet = useMemo(
    () => new Set(data.relatedColumnIds ?? []),
    [data.relatedColumnIds],
  );
  const columnsById = useMemo(
    () => new Map(data.columns.map((column) => [column.column_id, column])),
    [data.columns],
  );
  const typeOptions = useMemo(() => {
    const options = new Set(
      (data.dataTypeOptions ?? []).map((option) => option.trim()),
    );
    for (const column of data.columns) {
      options.add(getColumnTypeName(column));
    }
    return [...options].filter(Boolean);
  }, [data.columns, data.dataTypeOptions]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }
    if (editing.kind === "columnType") {
      selectRef.current?.focus();
      return;
    }
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const cancelEditing = () => {
    setEditing(null);
    setDraftValue("");
  };

  const commitEditing = () => {
    if (!editing) {
      return;
    }

    const nextValue = draftValue.trim();
    if (!nextValue) {
      cancelEditing();
      return;
    }

    if (editing.kind === "table") {
      if (nextValue !== data.displayName) {
        data.onRenameTable?.(data.tableId, nextValue);
      }
      cancelEditing();
      return;
    }

    const column = columnsById.get(editing.columnId);
    if (!column) {
      cancelEditing();
      return;
    }

    if (editing.kind === "columnName") {
      if (nextValue !== column.column_name) {
        data.onRenameColumn?.(data.tableId, column.column_id, nextValue);
      }
      cancelEditing();
      return;
    }

    const currentType = getColumnTypeName(column);
    if (nextValue !== currentType) {
      data.onChangeColumnType?.(data.tableId, column.column_id, nextValue);
    }
    cancelEditing();
  };

  return (
    <div className="relative w-[280px]">
      <div
        className={`cursor-grab overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors active:cursor-grabbing ${
          selected
            ? "border-pink-500 shadow-pink-100"
            : "border-blue-500 shadow-slate-200"
        }`}
      >
        <div
          className="flex h-10 items-center justify-between px-4"
          style={{
            backgroundColor: withOpacity(headerColor, "40"),
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Table2 className="h-4 w-4 shrink-0 text-slate-600" />
            {editing?.kind === "table" ? (
              <input
                ref={inputRef}
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                onBlur={commitEditing}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitEditing();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelEditing();
                  }
                }}
                className="nodrag nowheel h-7 w-full min-w-0 rounded border border-slate-300 px-2 text-[18px] font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  setEditing({ kind: "table" });
                  setDraftValue(data.displayName);
                }}
                className="truncate bg-transparent text-left text-[22px] font-semibold text-slate-900 [font-size:clamp(17px,0.95vw,22px)] focus:outline-none"
                title="Double-click to rename table"
              >
                {data.displayName}
              </button>
            )}
          </div>
        </div>

        <div
          className="border-t-2 border-slate-200"
          style={{ borderTopColor: headerColor }}
        />

        <div className="bg-white">
          {data.columns.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-400">
              No columns yet.
            </div>
          ) : (
            data.columns.map((column) => {
              const isRelatedColumn = relatedColumnSet.has(column.column_id);
              return (
                <div
                  key={column.column_id}
                  className={`grid h-[34px] grid-cols-[1fr_auto] items-center border-b border-slate-200 px-4 text-sm ${
                    selected && isRelatedColumn ? "bg-pink-50" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {column.is_primary_key ? (
                      <KeyRound
                        className={`h-4 w-4 shrink-0 ${
                          selected && isRelatedColumn
                            ? "text-blue-600"
                            : "text-slate-500"
                        }`}
                      />
                    ) : null}
                    {editing?.kind === "columnName" &&
                    editing.columnId === column.column_id ? (
                      <input
                        ref={inputRef}
                        value={draftValue}
                        onChange={(event) => setDraftValue(event.target.value)}
                        onBlur={commitEditing}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEditing();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                        className="nodrag nowheel h-7 w-full min-w-0 rounded border border-slate-300 px-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <button
                        type="button"
                        className={`block min-w-0 truncate bg-transparent text-left font-medium focus:outline-none ${
                          selected && isRelatedColumn
                            ? "text-blue-600"
                            : "text-slate-900"
                        }`}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditing({
                            kind: "columnName",
                            columnId: column.column_id,
                          });
                          setDraftValue(column.column_name);
                        }}
                        title="Double-click to rename column"
                      >
                        {column.column_name}
                      </button>
                    )}
                  </div>

                  <div
                    className={`ml-3 truncate text-right text-base [font-size:clamp(11px,0.8vw,16px)] ${
                      selected && isRelatedColumn
                        ? "text-blue-600"
                        : "text-slate-500"
                    }`}
                    title={renderTypeLabel(column)}
                  >
                    {editing?.kind === "columnType" &&
                    editing.columnId === column.column_id ? (
                      <select
                        ref={selectRef}
                        value={draftValue}
                        onChange={(event) => setDraftValue(event.target.value)}
                        onBlur={commitEditing}
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitEditing();
                          }
                          if (event.key === "Escape") {
                            event.preventDefault();
                            cancelEditing();
                          }
                        }}
                        className="nodrag nowheel h-7 w-full rounded border border-slate-300 px-2 text-right text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        {typeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          setEditing({
                            kind: "columnType",
                            columnId: column.column_id,
                          });
                          setDraftValue(getColumnTypeName(column));
                        }}
                        className={`block w-full truncate bg-transparent text-right focus:outline-none ${
                          selected && isRelatedColumn
                            ? "text-blue-600"
                            : "text-slate-500"
                        }`}
                        title="Double-click to change type"
                      >
                        {renderTypeLabel(column)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {data.columns.map((column, index) => {
        const handleTop =
          HEADER_HEIGHT +
          HEADER_DIVIDER_HEIGHT +
          index * ROW_HEIGHT +
          ROW_HEIGHT / 2;
        return (
          <Fragment key={`handles-${column.column_id}`}>
            <Handle
              type="target"
              position={Position.Left}
              id={`in-${column.column_id}`}
              isConnectable
              style={{
                top: handleTop,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                left: -HANDLE_OFFSET,
                zIndex: 10,
                opacity: selected ? 1 : 0,
                pointerEvents: selected ? "auto" : "none",
                background: "#ec4899",
                border: "2px solid #fff",
              }}
            />
            <Handle
              type="source"
              position={Position.Right}
              id={`out-${column.column_id}`}
              isConnectable
              style={{
                top: handleTop,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                right: -HANDLE_OFFSET,
                zIndex: 10,
                opacity: selected ? 1 : 0,
                pointerEvents: selected ? "auto" : "none",
                background: "#ec4899",
                border: "2px solid #fff",
              }}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
