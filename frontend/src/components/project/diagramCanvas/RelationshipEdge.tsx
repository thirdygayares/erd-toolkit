"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";
import { Pencil } from "lucide-react";

type Cardinality = "1" | "N";

interface RelationshipEdgeData {
  cardinalityFrom: Cardinality;
  cardinalityTo: Cardinality;
  isActive: boolean;
  relationshipId: string;
  onEditRelationship?: (relationshipId: string) => void;
}

function getBadgeOffset(position: Position, distance: number) {
  switch (position) {
    case Position.Left:
      return { x: -distance, y: 0 };
    case Position.Right:
      return { x: distance, y: 0 };
    case Position.Top:
      return { x: 0, y: -distance };
    case Position.Bottom:
      return { x: 0, y: distance };
    default:
      return { x: 0, y: 0 };
  }
}

export function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const relationshipData = (data ?? {}) as unknown as RelationshipEdgeData;

  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
    offset: 6,
  });

  const sourceLabel = relationshipData.cardinalityFrom ?? "N";
  const targetLabel = relationshipData.cardinalityTo ?? "1";
  const isActive = relationshipData.isActive ?? false;
  const sourceOffset = getBadgeOffset(sourcePosition, 3);
  const targetOffset = getBadgeOffset(targetPosition, 3);

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: "#64748b",
          strokeWidth: 2.2,
          strokeDasharray: isActive ? "6 6" : undefined,
          animation: isActive ? "dashdraw 0.9s linear infinite" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none absolute z-20 rounded-full bg-slate-600 px-2 py-0.5 text-[11px] font-bold text-white"
          style={{
            transform: `translate(-50%, -50%) translate(${sourceX + sourceOffset.x}px, ${sourceY + sourceOffset.y}px)`,
          }}
        >
          {sourceLabel}
        </div>
        <div
          className="nodrag nopan pointer-events-none absolute z-20 rounded-full bg-slate-600 px-2 py-0.5 text-[11px] font-bold text-white"
          style={{
            transform: `translate(-50%, -50%) translate(${targetX + targetOffset.x}px, ${targetY + targetOffset.y}px)`,
          }}
        >
          {targetLabel}
        </div>

        {isActive && relationshipData.onEditRelationship ? (
          <button
            type="button"
            className="nodrag nopan absolute z-30 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white shadow-md transition-transform hover:scale-110 hover:bg-slate-50"
            style={{
              pointerEvents: "auto",
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
            }}
            title="Edit Relationship"
            onClick={(e) => {
              e.stopPropagation();
              relationshipData.onEditRelationship?.(
                relationshipData.relationshipId,
              );
            }}
          >
            <Pencil className="h-3.5 w-3.5 text-slate-600" />
          </button>
        ) : null}
      </EdgeLabelRenderer>
    </>
  );
}
