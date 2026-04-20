"use client";

import {
  Background,
  ConnectionMode,
  Controls,
  type Edge,
  type EdgeMouseHandler,
  MiniMap,
  type NodeMouseHandler,
  type OnConnect,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import type { DiagramDetailResponse } from "@/lib/types";

import { RelationshipEdge } from "./RelationshipEdge";
import { TableNode, type TableNodeType } from "./TableNode";

interface DiagramCanvasProps {
  diagram: DiagramDetailResponse | undefined;
  selectedTableId: string;
  onSelectTable: (tableId: string) => void;
  onTablePositionChange: (
    tableId: string,
    position: { x: number; y: number },
  ) => void;
  onCreateTableAt: (position: { x: number; y: number }) => void;
  onCreateRelationshipRequest: () => void;
  onEditTable: (tableId: string) => void;
  onDuplicateTable: (tableId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onAddRelationshipFromTable: (tableId: string) => void;
  dataTypeOptions: string[];
  onInlineRenameTable: (tableId: string, nextDisplayName: string) => void;
  onInlineRenameColumn: (
    tableId: string,
    columnId: string,
    nextColumnName: string,
  ) => void;
  onInlineChangeColumnType: (
    tableId: string,
    columnId: string,
    nextTypeName: string,
  ) => void;
  onManualConnect: (connection: {
    fromTableId: string;
    fromColumnId: string;
    toTableId: string;
    toColumnId: string;
  }) => void;
  onEditRelationship: (relationshipId: string) => void;
  onDeleteRelationship: (relationshipId: string) => void;
}

const nodeTypes = {
  tableNode: TableNode,
};

const edgeTypes = {
  relationshipEdge: RelationshipEdge,
};

type PaneMenuState = {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
};

type NodeMenuState = {
  x: number;
  y: number;
  tableId: string;
};

type EdgeMenuState = {
  x: number;
  y: number;
  relationshipId: string;
};

function extractColumnId(handleId: string | null | undefined) {
  if (!handleId) {
    return null;
  }
  if (handleId.startsWith("out-")) {
    return handleId.slice(4);
  }
  if (handleId.startsWith("in-")) {
    return handleId.slice(3);
  }
  return null;
}

export function DiagramCanvas({
  diagram,
  selectedTableId,
  onSelectTable,
  onTablePositionChange,
  onCreateTableAt,
  onCreateRelationshipRequest,
  onEditTable,
  onDuplicateTable,
  onDeleteTable,
  onAddRelationshipFromTable,
  dataTypeOptions,
  onInlineRenameTable,
  onInlineRenameColumn,
  onInlineChangeColumnType,
  onManualConnect,
  onEditRelationship,
  onDeleteRelationship,
}: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null);

  const nodes: TableNodeType[] = useMemo(() => {
    const relatedColumnsByTable = new Map<string, Set<string>>();
    for (const relationship of diagram?.relationships ?? []) {
      const fromSet =
        relatedColumnsByTable.get(relationship.from_table_id) ??
        new Set<string>();
      fromSet.add(relationship.from_column_id);
      relatedColumnsByTable.set(relationship.from_table_id, fromSet);

      const toSet =
        relatedColumnsByTable.get(relationship.to_table_id) ??
        new Set<string>();
      toSet.add(relationship.to_column_id);
      relatedColumnsByTable.set(relationship.to_table_id, toSet);
    }

    return (diagram?.tables ?? []).map((table) => ({
      id: table.table_id,
      type: "tableNode",
      position: {
        x: Number(table.pos_x ?? 0),
        y: Number(table.pos_y ?? 0),
      },
      data: {
        tableId: table.table_id,
        schemaName: table.schema_name,
        tableName: table.table_name,
        displayName: table.display_name ?? table.table_name,
        colorHex: table.color_hex ?? "#65d5b8",
        columns: table.columns,
        relatedColumnIds: Array.from(
          relatedColumnsByTable.get(table.table_id) ?? [],
        ),
        dataTypeOptions,
        onRenameTable: onInlineRenameTable,
        onRenameColumn: onInlineRenameColumn,
        onChangeColumnType: onInlineChangeColumnType,
      },
      selected: table.table_id === selectedTableId,
    }));
  }, [
    dataTypeOptions,
    diagram?.relationships,
    diagram?.tables,
    onInlineChangeColumnType,
    onInlineRenameColumn,
    onInlineRenameTable,
    selectedTableId,
  ]);

  const edges: Edge[] = useMemo(() => {
    return (diagram?.relationships ?? []).map((relationship) => ({
      id: relationship.relationship_id,
      type: "relationshipEdge",
      source: relationship.from_table_id,
      target: relationship.to_table_id,
      sourceHandle: `out-${relationship.from_column_id}`,
      targetHandle: `in-${relationship.to_column_id}`,
      animated:
        relationship.from_table_id === selectedTableId ||
        relationship.to_table_id === selectedTableId,
      data: {
        cardinalityFrom: relationship.cardinality_from,
        cardinalityTo: relationship.cardinality_to,
        isActive:
          relationship.from_table_id === selectedTableId ||
          relationship.to_table_id === selectedTableId,
        relationshipId: relationship.relationship_id,
        onEditRelationship,
      },
    }));
  }, [diagram?.relationships, onEditRelationship, selectedTableId]);

  const closeMenus = useCallback(() => {
    setPaneMenu(null);
    setNodeMenu(null);
    setEdgeMenu(null);
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelectTable(node.id);
      closeMenus();
    },
    [closeMenus, onSelectTable],
  );

  const handlePaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!reactFlowInstance || !containerRef.current) {
        return;
      }

      const bounds = containerRef.current.getBoundingClientRect();
      const flowPoint = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setNodeMenu(null);
      setPaneMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        flowX: flowPoint.x,
        flowY: flowPoint.y,
      });
    },
    [reactFlowInstance],
  );

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      event.stopPropagation();
      if (!containerRef.current) {
        return;
      }

      const bounds = containerRef.current.getBoundingClientRect();
      onSelectTable(node.id);
      setPaneMenu(null);
      setNodeMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        tableId: node.id,
      });
    },
    [onSelectTable],
  );

  const handleEdgeContextMenu: EdgeMouseHandler = useCallback(
    (event, edge) => {
      event.preventDefault();
      event.stopPropagation();
      if (!containerRef.current) {
        return;
      }

      const bounds = containerRef.current.getBoundingClientRect();
      setPaneMenu(null);
      setNodeMenu(null);
      setEdgeMenu({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        relationshipId: edge.id,
      });
    },
    [],
  );

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const fromColumnId = extractColumnId(connection.sourceHandle);
      const toColumnId = extractColumnId(connection.targetHandle);

      if (
        !connection.source ||
        !connection.target ||
        !fromColumnId ||
        !toColumnId
      ) {
        return;
      }

      onManualConnect({
        fromTableId: connection.source,
        fromColumnId,
        toTableId: connection.target,
        toColumnId,
      });
    },
    [onManualConnect],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#f8fafc]"
    >
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneClick={closeMenus}
        onNodeDragStop={(_event, node) => {
          onTablePositionChange(node.id, node.position);
        }}
        onConnect={handleConnect}
        connectionMode={ConnectionMode.Strict}
        nodeDragThreshold={0}
        connectionDragThreshold={6}
        onlyRenderVisibleElements
        minZoom={0.25}
        maxZoom={2}
      >
        <MiniMap
          zoomable
          pannable
          nodeStrokeColor="#64748b"
          nodeColor="#e2e8f0"
          nodeBorderRadius={4}
        />
        <Controls />
        <Background gap={18} color="#d2dbe8" />
      </ReactFlow>

      {paneMenu ? (
        <div
          className="absolute z-20 w-64 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl"
          style={{ left: paneMenu.x, top: paneMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              onCreateTableAt({ x: paneMenu.flowX, y: paneMenu.flowY });
              closeMenus();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-lg hover:bg-slate-100"
          >
            <span>New Table</span>
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onCreateRelationshipRequest();
              closeMenus();
            }}
            className="flex w-full items-center justify-between border-t border-slate-200 px-4 py-3 text-left text-lg hover:bg-slate-100"
          >
            <span>New Relationship</span>
            <Link2 className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {nodeMenu ? (
        <div
          className="absolute z-20 w-64 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl"
          style={{ left: nodeMenu.x, top: nodeMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              onEditTable(nodeMenu.tableId);
              closeMenus();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-lg hover:bg-slate-100"
          >
            <span>Edit Table</span>
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onDuplicateTable(nodeMenu.tableId);
              closeMenus();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-lg hover:bg-slate-100"
          >
            <span>Duplicate Table</span>
            <Plus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onAddRelationshipFromTable(nodeMenu.tableId);
              closeMenus();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-lg hover:bg-slate-100"
          >
            <span>Add Relationship</span>
            <Link2 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onDeleteTable(nodeMenu.tableId);
              closeMenus();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-lg text-red-600 hover:bg-red-50"
          >
            <span>Delete Table</span>
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      {edgeMenu ? (
        <div
          className="absolute z-20 w-64 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl"
          style={{ left: edgeMenu.x, top: edgeMenu.y }}
        >
          <button
            type="button"
            onClick={() => {
              onEditRelationship(edgeMenu.relationshipId);
              closeMenus();
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-lg hover:bg-slate-100"
          >
            <span>Edit Relationship</span>
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onDeleteRelationship(edgeMenu.relationshipId);
              closeMenus();
            }}
            className="flex w-full items-center justify-between border-t border-slate-200 px-4 py-3 text-left text-lg text-red-600 hover:bg-red-50"
          >
            <span>Delete Relationship</span>
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
