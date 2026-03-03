"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { KeyRound, Table2 } from "lucide-react";
import { Fragment } from "react";

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
}

export type TableNodeType = Node<TableNodeData, "tableNode">;

function renderTypeLabel(column: ColumnResponse) {
  return `${column.data_type}${column.is_nullable ? "?" : ""}`;
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
  const relatedColumnSet = new Set(data.relatedColumnIds ?? []);

  return (
    <div className="relative w-[280px]">
      <div
        className={`overflow-hidden rounded-xl border-2 bg-white shadow-sm transition-colors ${
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
            <span className="truncate text-[22px] font-semibold text-slate-900 [font-size:clamp(17px,0.95vw,22px)]">
              {data.displayName}
            </span>
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
                    <span
                      className={`truncate font-medium ${
                        selected && isRelatedColumn
                          ? "text-blue-600"
                          : "text-slate-900"
                      }`}
                    >
                      {column.column_name}
                    </span>
                  </div>

                  <span
                    className={`ml-3 truncate text-right text-base [font-size:clamp(11px,0.8vw,16px)] ${
                      selected && isRelatedColumn
                        ? "text-blue-600"
                        : "text-slate-500"
                    }`}
                    title={renderTypeLabel(column)}
                  >
                    {renderTypeLabel(column)}
                  </span>
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
