"use client";

import {
  Background,
  ConnectionMode,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  type NodeMouseHandler,
  type OnConnect,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { DiagramDetailResponse } from "@/lib/types";

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
  onManualConnect: (connection: {
    fromTableId: string;
    fromColumnId: string;
    toTableId: string;
    toColumnId: string;
  }) => void;
  onPairTableRequest: (sourceTableId: string, targetTableId: string) => void;
}

const nodeTypes = {
  tableNode: TableNode,
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

function extractColumnId(handleId: string | null | undefined) {
  if (!handleId) {
    return null;
  }
  const [, columnId] = handleId.split("-");
  return columnId ?? null;
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
  onManualConnect,
  onPairTableRequest,
}: DiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);

  const nodes: TableNodeType[] = useMemo(() => {
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
      },
      selected: table.table_id === selectedTableId,
    }));
  }, [diagram?.tables, selectedTableId]);

  const edges: Edge[] = useMemo(() => {
    return (diagram?.relationships ?? []).map((relationship) => ({
      id: relationship.relationship_id,
      source: relationship.from_table_id,
      target: relationship.to_table_id,
      sourceHandle: `out-${relationship.from_column_id}`,
      targetHandle: `in-${relationship.to_column_id}`,
      label: `${relationship.cardinality_from}:${relationship.cardinality_to}`,
      type: "step",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "#334155",
      },
      style: {
        stroke: "#334155",
        strokeWidth: 2.2,
      },
      labelStyle: {
        fill: "#334155",
        fontSize: 11,
        fontWeight: 700,
      },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.96,
      },
      labelBgPadding: [4, 2],
      labelBgBorderRadius: 4,
    }));
  }, [diagram?.relationships]);

  const closeMenus = () => {
    setPaneMenu(null);
    setNodeMenu(null);
  };

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onSelectTable(node.id);
    closeMenus();
  };

  const handlePaneContextMenu = (
    event: MouseEvent | React.MouseEvent<Element, MouseEvent>,
  ) => {
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
  };

  const handleNodeContextMenu: NodeMouseHandler = (event, node) => {
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
  };

  const handleConnect: OnConnect = (connection) => {
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
  };

  const findNearbyTable = (dragged: Node): string | null => {
    if (!reactFlowInstance) {
      return null;
    }

    const nodes = reactFlowInstance.getNodes();
    let nearestId: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const node of nodes) {
      if (node.id === dragged.id) {
        continue;
      }

      const dx = node.position.x - dragged.position.x;
      const dy = node.position.y - dragged.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestId = node.id;
      }
    }

    if (nearestDistance <= 190) {
      return nearestId;
    }
    return null;
  };

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
        onInit={setReactFlowInstance}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onPaneClick={closeMenus}
        onNodeDragStop={(_event, node) => {
          onTablePositionChange(node.id, node.position);
          const nearbyTableId = findNearbyTable(node);
          if (nearbyTableId) {
            onPairTableRequest(node.id, nearbyTableId);
          }
        }}
        onConnect={handleConnect}
        connectionMode={ConnectionMode.Strict}
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
    </div>
  );
}
