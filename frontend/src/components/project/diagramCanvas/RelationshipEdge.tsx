"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  Position,
} from "@xyflow/react";

type Cardinality = "1" | "N";

interface RelationshipEdgeData {
  cardinalityFrom: Cardinality;
  cardinalityTo: Cardinality;
  isActive: boolean;
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
      </EdgeLabelRenderer>
    </>
  );
}
