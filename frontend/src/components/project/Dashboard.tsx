"use client";

import {
  Activity,
  Cable,
  ChevronDown,
  Database,
  Download,
  FileCode2,
  KeyRound,
  Link2,
  Lock,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Table2,
  Trash2,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCreateDiagramMutation } from "@/hooks/diagram/useCreateDiagramMutation";
import { useCreateSnapshotMutation } from "@/hooks/diagram/useCreateSnapshotMutation";
import { useGetDiagramQuery } from "@/hooks/diagram/useGetDiagramQuery";
import { useListDiagramsByWorkspaceQuery } from "@/hooks/diagram/useListDiagramsByWorkspaceQuery";
import { useExportSqlMutation } from "@/hooks/export/useExportSqlMutation";
import { useImportPostgresMutation } from "@/hooks/import/useImportPostgresMutation";
import { useGetProjectQuery } from "@/hooks/project/useGetProjectQuery";
import { useUpdateProjectVisibilityMutation } from "@/hooks/project/useUpdateProjectVisibilityMutation";
import { useCreateColumnMutation } from "@/hooks/schemaEditor/useCreateColumnMutation";
import { useCreateRelationshipMutation } from "@/hooks/schemaEditor/useCreateRelationshipMutation";
import { useCreateTableMutation } from "@/hooks/schemaEditor/useCreateTableMutation";
import { useDeleteRelationshipMutation } from "@/hooks/schemaEditor/useDeleteRelationshipMutation";
import { useUpdateColumnMutation } from "@/hooks/schemaEditor/useUpdateColumnMutation";
import { useUpdateRelationshipMutation } from "@/hooks/schemaEditor/useUpdateRelationshipMutation";
import { useUpdateTableMutation } from "@/hooks/schemaEditor/useUpdateTableMutation";
import type { ColumnResponse, TableResponse } from "@/lib/types";

import { DiagramCanvas } from "./diagramCanvas/DiagramCanvas";

type SidebarMode = "tables" | "relations" | "customTypes" | "importExport";
type TableDialogMode = "create" | "edit";
type RelationshipDialogMode = "create" | "edit";

const sessionStorageKey = {
  workspaceId: "ERD_WORKSPACE_ID",
  projectId: "ERD_PROJECT_ID",
  diagramId: "ERD_DIAGRAM_ID",
  shareSlug: "ERD_SHARE_SLUG",
} as const;

const tableColors = [
  "#65d5b8",
  "#7ca7ef",
  "#ae7feb",
  "#ef8ab4",
  "#f5bf6c",
  "#6dcdf6",
  "#f88a8a",
];

const postgresTypeOptions = [
  "boolean",
  "date",
  "int",
  "bigint",
  "numeric",
  "text",
  "varchar",
  "varchar(n)",
  "uuid",
  "timestamp",
  "timestamptz",
  "jsonb",
  "bytea",
];

interface DashboardProps {
  projectId: string;
  initialShareSlug?: string | null;
}

interface TableDialogState {
  open: boolean;
  mode: TableDialogMode;
  tableId: string | null;
  schemaName: string;
  tableName: string;
  displayName: string;
  colorHex: string;
  posX: number;
  posY: number;
}

interface FieldAttributesDraft {
  tableId: string;
  columnId: string;
  unique: boolean;
  autoIncrement: boolean;
  array: boolean;
  defaultValue: string;
  comments: string;
  baseType: string;
}

interface RelationshipComposerState {
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinalityFrom: "1" | "N";
  cardinalityTo: "1" | "N";
  name: string;
}

interface RelationshipDialogState {
  open: boolean;
  mode: RelationshipDialogMode;
  relationshipId: string | null;
}

function normalizeTableName(name: string, fallback: string) {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function randomColor() {
  return tableColors[0] ?? "#65d5b8";
}

function normalizeTypeForComparison(dataType: string) {
  let value = dataType.toLowerCase().trim();
  value = value.replace(/\(.*?\)/g, "");
  value = value.replace(/\[\]/g, "");
  value = value.replace(/\?/g, "");

  if (["character varying", "varchar", "varchar(n)", "text"].includes(value)) {
    return "text";
  }
  if (["integer", "int4", "int"].includes(value)) {
    return "int";
  }
  if (["int8", "bigint"].includes(value)) {
    return "bigint";
  }
  if (["bool", "boolean"].includes(value)) {
    return "boolean";
  }
  if (["timestamp with time zone", "timestamptz"].includes(value)) {
    return "timestamptz";
  }
  if (["timestamp without time zone", "timestamp"].includes(value)) {
    return "timestamp";
  }

  return value;
}

function removeArraySuffix(dataType: string) {
  return dataType.endsWith("[]") ? dataType.slice(0, -2) : dataType;
}

function inferAutoIncrement(defaultSql: string | null) {
  if (!defaultSql) {
    return false;
  }
  const normalized = defaultSql.toLowerCase();
  return normalized.includes("identity") || normalized.includes("nextval");
}

function findColumn(
  tables: TableResponse[],
  tableId: string,
  columnId: string,
): ColumnResponse | null {
  const table = tables.find((item) => item.table_id === tableId);
  if (!table) {
    return null;
  }
  return table.columns.find((column) => column.column_id === columnId) ?? null;
}

export function Dashboard({ projectId, initialShareSlug }: DashboardProps) {
  const [activeProjectId, setActiveProjectId] = useState(
    initialShareSlug ? "" : projectId,
  );
  const [workspaceId, setWorkspaceId] = useState("");
  const [diagramId, setDiagramId] = useState("");
  const [shareSlug, setShareSlug] = useState(initialShareSlug ?? "");

  const [statusMessage, setStatusMessage] = useState("Loading project...");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("tables");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarPanelWidth, setSidebarPanelWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [tableFilter, setTableFilter] = useState("");
  const [relationFilter, setRelationFilter] = useState("");

  const [selectedTableId, setSelectedTableId] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");

  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedRelationships, setExpandedRelationships] = useState<
    Record<string, boolean>
  >({});

  const [tableDialog, setTableDialog] = useState<TableDialogState>({
    open: false,
    mode: "create",
    tableId: null,
    schemaName: "public",
    tableName: "",
    displayName: "",
    colorHex: randomColor(),
    posX: 120,
    posY: 120,
  });

  const [fieldAttributesDraft, setFieldAttributesDraft] =
    useState<FieldAttributesDraft | null>(null);

  const [tableComments, setTableComments] = useState<Record<string, string>>(
    {},
  );
  const [columnComments, setColumnComments] = useState<Record<string, string>>(
    {},
  );
  const [columnNameDrafts, setColumnNameDrafts] = useState<
    Record<string, string>
  >({});

  const [newColumnByTable, setNewColumnByTable] = useState<
    Record<string, { name: string; dataType: string; isNullable: boolean }>
  >({});

  const [relationshipComposer, setRelationshipComposer] =
    useState<RelationshipComposerState>({
      sourceTableId: "",
      sourceColumnId: "",
      targetTableId: "",
      targetColumnId: "",
      cardinalityFrom: "N",
      cardinalityTo: "1",
      name: "",
    });

  const [relationshipDialog, setRelationshipDialog] =
    useState<RelationshipDialogState>({
      open: false,
      mode: "create",
      relationshipId: null,
    });

  const [importHost, setImportHost] = useState("localhost");
  const [importPort, setImportPort] = useState(5432);
  const [importDatabase, setImportDatabase] = useState("erd_toolkit");
  const [importUser, setImportUser] = useState("postgres");
  const [importPassword, setImportPassword] = useState("");
  const [importSchema, setImportSchema] = useState("public");
  const [exportSchema, setExportSchema] = useState("public");
  const [exportSqlOutput, setExportSqlOutput] = useState("");

  const attemptedDiagramCreateKeyRef = useRef<string | null>(null);

  const projectQuery = useGetProjectQuery(activeProjectId);
  const createDiagramMutation = useCreateDiagramMutation();
  const listDiagramsQuery = useListDiagramsByWorkspaceQuery(workspaceId);
  const diagramQuery = useGetDiagramQuery(diagramId);

  const createTableMutation = useCreateTableMutation();
  const updateTableMutation = useUpdateTableMutation();
  const createColumnMutation = useCreateColumnMutation();
  const updateColumnMutation = useUpdateColumnMutation();
  const createRelationshipMutation = useCreateRelationshipMutation();
  const updateRelationshipMutation = useUpdateRelationshipMutation();
  const deleteRelationshipMutation = useDeleteRelationshipMutation();

  const updateProjectVisibilityMutation = useUpdateProjectVisibilityMutation();
  const importPostgresMutation = useImportPostgresMutation();
  const exportSqlMutation = useExportSqlMutation();
  const createSnapshotMutation = useCreateSnapshotMutation();

  const tables = diagramQuery.data?.tables ?? [];
  const relationships = diagramQuery.data?.relationships ?? [];

  const selectedTable = useMemo(() => {
    return tables.find((table) => table.table_id === selectedTableId) ?? null;
  }, [tables, selectedTableId]);

  const filteredTables = useMemo(() => {
    if (!tableFilter.trim()) {
      return tables;
    }
    const keyword = tableFilter.toLowerCase().trim();

    return tables.filter((table) => {
      const tableLabel =
        `${table.schema_name}.${table.table_name}`.toLowerCase();
      const displayLabel = (table.display_name ?? "").toLowerCase();
      return tableLabel.includes(keyword) || displayLabel.includes(keyword);
    });
  }, [tables, tableFilter]);

  const filteredRelationships = useMemo(() => {
    if (!relationFilter.trim()) {
      return relationships;
    }
    const keyword = relationFilter.toLowerCase().trim();
    return relationships.filter((relationship) => {
      const fromTable = tables.find(
        (table) => table.table_id === relationship.from_table_id,
      );
      const toTable = tables.find(
        (table) => table.table_id === relationship.to_table_id,
      );
      const text =
        `${relationship.name} ${fromTable?.table_name ?? ""} ${toTable?.table_name ?? ""}`.toLowerCase();
      return text.includes(keyword);
    });
  }, [relationships, relationFilter, tables]);

  const customTypeOptions = useMemo(() => {
    const fromColumns = new Set<string>();
    for (const table of tables) {
      for (const column of table.columns) {
        if (
          column.data_type &&
          !postgresTypeOptions.includes(column.data_type)
        ) {
          fromColumns.add(column.data_type);
        }
      }
    }

    return [...postgresTypeOptions, ...[...fromColumns].sort()];
  }, [tables]);

  const isWorking =
    createDiagramMutation.isPending ||
    createTableMutation.isPending ||
    updateTableMutation.isPending ||
    createColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    createRelationshipMutation.isPending ||
    updateRelationshipMutation.isPending ||
    deleteRelationshipMutation.isPending ||
    importPostgresMutation.isPending ||
    exportSqlMutation.isPending ||
    createSnapshotMutation.isPending ||
    updateProjectVisibilityMutation.isPending;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(sessionStorageKey.projectId, projectId);

    if (initialShareSlug) {
      window.localStorage.setItem(
        sessionStorageKey.shareSlug,
        initialShareSlug,
      );
      setShareSlug(initialShareSlug);
    }

    setActiveProjectId(projectId);
  }, [projectId, initialShareSlug]);

  useEffect(() => {
    const project = projectQuery.data;
    if (!project) {
      return;
    }

    setWorkspaceId(project.workspace_id);
    setStatusMessage(`Project loaded: ${project.name}`);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        sessionStorageKey.workspaceId,
        project.workspace_id,
      );
      if (project.share_slug) {
        setShareSlug(project.share_slug);
        window.localStorage.setItem(
          sessionStorageKey.shareSlug,
          project.share_slug,
        );
      }
    }
  }, [projectQuery.data]);

  const createDiagram = createDiagramMutation.mutateAsync;

  useEffect(() => {
    if (!workspaceId || !listDiagramsQuery.data || diagramId) {
      return;
    }

    const projectDiagram = listDiagramsQuery.data.find(
      (diagram) => diagram.project_id === projectId,
    );

    if (projectDiagram) {
      setDiagramId(projectDiagram.diagram_id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          sessionStorageKey.diagramId,
          projectDiagram.diagram_id,
        );
      }
      setStatusMessage(`Diagram loaded: ${projectDiagram.name}`);
      return;
    }

    const createKey = `${workspaceId}:${projectId}`;
    if (attemptedDiagramCreateKeyRef.current === createKey) {
      return;
    }

    attemptedDiagramCreateKeyRef.current = createKey;
    createDiagram({
      workspace_id: workspaceId,
      project_id: projectId,
      name: "Main Diagram",
    })
      .then((diagram) => {
        setDiagramId(diagram.diagram_id);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            sessionStorageKey.diagramId,
            diagram.diagram_id,
          );
        }
        setStatusMessage("Main diagram created.");
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Unable to create diagram.";
        setStatusMessage(message);
      });
  }, [
    workspaceId,
    projectId,
    diagramId,
    listDiagramsQuery.data,
    createDiagram,
  ]);

  useEffect(() => {
    if (!tables.length) {
      setSelectedTableId("");
      setSelectedColumnId("");
      return;
    }

    if (!tables.some((table) => table.table_id === selectedTableId)) {
      setSelectedTableId(tables[0].table_id);
    }

    setExpandedTables((current) => {
      const next = { ...current };
      for (const table of tables) {
        if (next[table.table_id] === undefined) {
          next[table.table_id] = table.table_id === tables[0].table_id;
        }
      }
      return next;
    });
  }, [tables, selectedTableId]);

  useEffect(() => {
    if (!selectedTable) {
      setSelectedColumnId("");
      return;
    }

    if (!selectedTable.columns.length) {
      setSelectedColumnId("");
      return;
    }

    if (
      !selectedTable.columns.some(
        (column) => column.column_id === selectedColumnId,
      )
    ) {
      setSelectedColumnId(selectedTable.columns[0].column_id);
    }
  }, [selectedTable, selectedColumnId]);

  useEffect(() => {
    if (!selectedTable) {
      return;
    }

    setRelationshipComposer((current) => {
      if (current.sourceTableId) {
        return current;
      }
      const sourceColumnId =
        selectedTable.columns.find((column) => column.is_primary_key)
          ?.column_id ??
        selectedTable.columns[0]?.column_id ??
        "";
      return {
        ...current,
        sourceTableId: selectedTable.table_id,
        sourceColumnId,
      };
    });
  }, [selectedTable]);

  // Load sidebar width from localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem("ERD_SIDEBAR_WIDTH");
    if (saved) {
      const width = Math.max(250, Math.min(600, Number(saved)));
      setSidebarPanelWidth(width);
    }
  }, []);

  // Save sidebar width to localStorage
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem("ERD_SIDEBAR_WIDTH", String(sidebarPanelWidth));
  }, [sidebarPanelWidth]);

  // Handle resize events
  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e: MouseEvent) => {
      const newWidth = e.clientX - 56; // 56px is icon rail width
      setSidebarPanelWidth(Math.max(250, Math.min(600, newWidth)));
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", handleResizeEnd);

    return () => {
      window.removeEventListener("mousemove", handleResizeMove);
      window.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [isResizing]);

  function updateRelationshipSource(tableId: string) {
    const sourceTable = tables.find((table) => table.table_id === tableId);
    const sourceColumnId =
      sourceTable?.columns.find((column) => column.is_primary_key)?.column_id ??
      sourceTable?.columns[0]?.column_id ??
      "";

    setRelationshipComposer((current) => ({
      ...current,
      sourceTableId: tableId,
      sourceColumnId,
    }));
  }

  function updateRelationshipTarget(tableId: string) {
    const targetTable = tables.find((table) => table.table_id === tableId);
    const targetColumnId =
      targetTable?.columns.find((column) => column.is_primary_key)?.column_id ??
      targetTable?.columns[0]?.column_id ??
      "";

    setRelationshipComposer((current) => ({
      ...current,
      targetTableId: tableId,
      targetColumnId,
    }));
  }

  function openCreateTableDialog(position?: { x: number; y: number }) {
    const nextIndex = tables.length + 1;
    const tableName = `table_${nextIndex}`;

    setTableDialog({
      open: true,
      mode: "create",
      tableId: null,
      schemaName: "public",
      tableName,
      displayName: tableName,
      colorHex: randomColor(),
      posX: position?.x ?? 100 + (nextIndex % 4) * 320,
      posY: position?.y ?? 80 + Math.floor(nextIndex / 4) * 240,
    });
  }

  function openEditTableDialog(tableId: string) {
    const table = tables.find((item) => item.table_id === tableId);
    if (!table) {
      return;
    }

    setTableDialog({
      open: true,
      mode: "edit",
      tableId,
      schemaName: table.schema_name,
      tableName: table.table_name,
      displayName: table.display_name ?? table.table_name,
      colorHex: table.color_hex ?? randomColor(),
      posX: table.pos_x,
      posY: table.pos_y,
    });
  }

  async function saveTableDialog() {
    if (!diagramId) {
      return;
    }

    if (tableDialog.mode === "create") {
      const tableName = normalizeTableName(tableDialog.tableName, "table_new");
      const displayName = tableDialog.displayName.trim() || tableName;

      try {
        const createdTable = await createTableMutation.mutateAsync({
          diagramId,
          payload: {
            schema_name: tableDialog.schemaName.trim() || "public",
            table_name: tableName,
            display_name: displayName,
            pos_x: Math.round(tableDialog.posX),
            pos_y: Math.round(tableDialog.posY),
            color_hex: tableDialog.colorHex,
          },
        });
        setSelectedTableId(createdTable.table_id);
        setStatusMessage(`Table created: ${createdTable.table_name}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to create table.";
        setStatusMessage(message);
      }
    } else if (tableDialog.tableId) {
      try {
        await updateTableMutation.mutateAsync({
          diagramId,
          tableId: tableDialog.tableId,
          payload: {
            display_name:
              tableDialog.displayName.trim() || tableDialog.tableName,
            color_hex: tableDialog.colorHex,
          },
        });
        setStatusMessage("Table updated.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update table.";
        setStatusMessage(message);
      }
    }

    setTableDialog((current) => ({ ...current, open: false }));
  }

  async function deleteTable(tableId: string) {
    if (!diagramId) {
      return;
    }

    try {
      await updateTableMutation.mutateAsync({
        diagramId,
        tableId,
        payload: {
          is_deleted: true,
        },
      });
      setStatusMessage("Table deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete table.";
      setStatusMessage(message);
    }
  }

  async function duplicateTable(tableId: string) {
    if (!diagramId) {
      return;
    }

    const source = tables.find((table) => table.table_id === tableId);
    if (!source) {
      return;
    }

    const suffix = Date.now().toString().slice(-4);
    const duplicateName = `${source.table_name}_copy_${suffix}`;

    try {
      const duplicated = await createTableMutation.mutateAsync({
        diagramId,
        payload: {
          schema_name: source.schema_name,
          table_name: normalizeTableName(duplicateName, `copy_${suffix}`),
          display_name: `${source.display_name ?? source.table_name} copy`,
          pos_x: Number(source.pos_x) + 80,
          pos_y: Number(source.pos_y) + 80,
          color_hex: source.color_hex,
        },
      });

      const orderedColumns = [...source.columns].sort(
        (left, right) => left.ordinal_position - right.ordinal_position,
      );

      for (const column of orderedColumns) {
        await createColumnMutation.mutateAsync({
          diagramId,
          tableId: duplicated.table_id,
          payload: {
            column_name: column.column_name,
            ordinal_position: column.ordinal_position,
            data_type: column.data_type,
            udt_name: column.udt_name,
            is_nullable: column.is_nullable,
            default_sql: column.default_sql,
            is_primary_key: column.is_primary_key,
            is_unique: column.is_unique,
          },
        });
      }

      setSelectedTableId(duplicated.table_id);
      setStatusMessage(`Table duplicated: ${duplicated.table_name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to duplicate table.";
      setStatusMessage(message);
    }
  }

  async function updateTablePosition(
    tableId: string,
    position: { x: number; y: number },
  ) {
    if (!diagramId) {
      return;
    }

    const existing = tables.find((table) => table.table_id === tableId);
    if (!existing) {
      return;
    }

    if (
      Math.round(existing.pos_x) === Math.round(position.x) &&
      Math.round(existing.pos_y) === Math.round(position.y)
    ) {
      return;
    }

    updateTableMutation.mutate({
      diagramId,
      tableId,
      payload: {
        pos_x: Math.round(position.x),
        pos_y: Math.round(position.y),
      },
    });
  }

  function setNewColumnDraft(
    tableId: string,
    patch: Partial<{ name: string; dataType: string; isNullable: boolean }>,
  ) {
    setNewColumnByTable((current) => ({
      ...current,
      [tableId]: {
        name: current[tableId]?.name ?? "",
        dataType: current[tableId]?.dataType ?? "text",
        isNullable: current[tableId]?.isNullable ?? true,
        ...patch,
      },
    }));
  }

  async function addColumnToTable(tableId: string) {
    if (!diagramId) {
      return;
    }

    const table = tables.find((item) => item.table_id === tableId);
    if (!table) {
      return;
    }

    const draft = newColumnByTable[tableId] ?? {
      name: "",
      dataType: "text",
      isNullable: true,
    };

    const nextOrdinal =
      table.columns.reduce(
        (currentMax, column) => Math.max(currentMax, column.ordinal_position),
        0,
      ) + 1;

    const columnName = draft.name.trim();
    if (!columnName) {
      return;
    }

    try {
      const createdColumn = await createColumnMutation.mutateAsync({
        diagramId,
        tableId,
        payload: {
          column_name: columnName,
          ordinal_position: nextOrdinal,
          data_type: draft.dataType,
          is_nullable: draft.isNullable,
          is_primary_key: false,
          is_unique: false,
        },
      });

      setSelectedTableId(tableId);
      setSelectedColumnId(createdColumn.column_id);
      setNewColumnDraft(tableId, {
        name: "",
        dataType: draft.dataType,
        isNullable: draft.isNullable,
      });
      setStatusMessage(`Column created: ${createdColumn.column_name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create column.";
      setStatusMessage(message);
    }
  }

  async function updateColumn(
    tableId: string,
    columnId: string,
    patch: Parameters<typeof updateColumnMutation.mutateAsync>[0]["payload"],
  ) {
    if (!diagramId) {
      return;
    }

    try {
      await updateColumnMutation.mutateAsync({
        diagramId,
        tableId,
        columnId,
        payload: patch,
      });
      setStatusMessage("Column updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update column.";
      setStatusMessage(message);
    }
  }

  function openFieldAttributes(table: TableResponse, column: ColumnResponse) {
    const baseType = removeArraySuffix(column.data_type);

    setFieldAttributesDraft({
      tableId: table.table_id,
      columnId: column.column_id,
      unique: column.is_unique,
      autoIncrement: inferAutoIncrement(column.default_sql),
      array: column.data_type.endsWith("[]"),
      defaultValue: column.default_sql ?? "",
      comments: columnComments[column.column_id] ?? "",
      baseType,
    });
  }

  async function saveFieldAttributes() {
    if (!fieldAttributesDraft) {
      return;
    }

    const dataType = fieldAttributesDraft.array
      ? `${removeArraySuffix(fieldAttributesDraft.baseType)}[]`
      : removeArraySuffix(fieldAttributesDraft.baseType);

    const nextDefault = fieldAttributesDraft.autoIncrement
      ? "generated by default as identity"
      : fieldAttributesDraft.defaultValue.trim() || null;

    await updateColumn(
      fieldAttributesDraft.tableId,
      fieldAttributesDraft.columnId,
      {
        data_type: dataType,
        is_unique: fieldAttributesDraft.unique,
        default_sql: nextDefault,
      },
    );

    setColumnComments((current) => ({
      ...current,
      [fieldAttributesDraft.columnId]: fieldAttributesDraft.comments,
    }));

    setFieldAttributesDraft(null);
  }

  async function createRelationship(payload: {
    fromTableId: string;
    fromColumnId: string;
    toTableId: string;
    toColumnId: string;
    cardinalityFrom?: "1" | "N";
    cardinalityTo?: "1" | "N";
    name?: string;
  }) {
    if (!diagramId) {
      return;
    }

    const sourceColumn = findColumn(
      tables,
      payload.fromTableId,
      payload.fromColumnId,
    );
    const targetColumn = findColumn(
      tables,
      payload.toTableId,
      payload.toColumnId,
    );

    if (!sourceColumn || !targetColumn) {
      setStatusMessage(
        "Relationship requires valid source and target columns.",
      );
      return;
    }

    const sourceType = normalizeTypeForComparison(sourceColumn.data_type);
    const targetType = normalizeTypeForComparison(targetColumn.data_type);

    if (sourceType !== targetType) {
      setStatusMessage(
        `Type mismatch: ${sourceColumn.column_name} (${sourceColumn.data_type}) cannot connect to ${targetColumn.column_name} (${targetColumn.data_type}).`,
      );
      return;
    }

    const duplicate = relationships.some(
      (relationship) =>
        relationship.from_table_id === payload.fromTableId &&
        relationship.from_column_id === payload.fromColumnId &&
        relationship.to_table_id === payload.toTableId &&
        relationship.to_column_id === payload.toColumnId,
    );

    if (duplicate) {
      setStatusMessage("Relationship already exists.");
      return;
    }

    const fromTable = tables.find(
      (table) => table.table_id === payload.fromTableId,
    );
    const toTable = tables.find(
      (table) => table.table_id === payload.toTableId,
    );

    const generatedName =
      payload.name?.trim() ||
      `fk_${fromTable?.table_name ?? "source"}_${sourceColumn.column_name}_${toTable?.table_name ?? "target"}`;

    try {
      await createRelationshipMutation.mutateAsync({
        diagramId,
        payload: {
          name: generatedName,
          from_table_id: payload.fromTableId,
          from_column_id: payload.fromColumnId,
          to_table_id: payload.toTableId,
          to_column_id: payload.toColumnId,
          cardinality_from: payload.cardinalityFrom ?? "N",
          cardinality_to: payload.cardinalityTo ?? "1",
          on_update_action: "NO ACTION",
          on_delete_action: "NO ACTION",
          is_identifying: false,
        },
      });
      setStatusMessage(`Relationship created: ${generatedName}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to create relationship.";
      setStatusMessage(message);
    }
  }

  function openCreateRelationshipDialog(
    sourceTableId?: string,
    targetTableId?: string,
  ) {
    const sourceTable =
      tables.find((table) => table.table_id === sourceTableId) ?? tables[0];
    const targetTable =
      tables.find((table) => table.table_id === targetTableId) ??
      tables.find((table) => table.table_id !== sourceTable?.table_id);

    setRelationshipComposer({
      sourceTableId: sourceTable?.table_id ?? "",
      sourceColumnId:
        sourceTable?.columns.find((column) => column.is_primary_key)
          ?.column_id ??
        sourceTable?.columns[0]?.column_id ??
        "",
      targetTableId: targetTable?.table_id ?? "",
      targetColumnId:
        targetTable?.columns.find((column) => column.is_primary_key)
          ?.column_id ??
        targetTable?.columns[0]?.column_id ??
        "",
      cardinalityFrom: "N",
      cardinalityTo: "1",
      name: "",
    });
    setRelationshipDialog({
      open: true,
      mode: "create",
      relationshipId: null,
    });
  }

  function openEditRelationshipDialog(relationshipId: string) {
    const relationship = relationships.find(
      (item) => item.relationship_id === relationshipId,
    );
    if (!relationship) {
      return;
    }

    setRelationshipComposer({
      sourceTableId: relationship.from_table_id,
      sourceColumnId: relationship.from_column_id,
      targetTableId: relationship.to_table_id,
      targetColumnId: relationship.to_column_id,
      cardinalityFrom: relationship.cardinality_from as "1" | "N",
      cardinalityTo: relationship.cardinality_to as "1" | "N",
      name: relationship.name,
    });
    setRelationshipDialog({
      open: true,
      mode: "edit",
      relationshipId,
    });
  }

  async function saveRelationshipDialog() {
    if (!diagramId) {
      return;
    }

    if (relationshipDialog.mode === "create") {
      await createRelationship({
        fromTableId: relationshipComposer.sourceTableId,
        fromColumnId: relationshipComposer.sourceColumnId,
        toTableId: relationshipComposer.targetTableId,
        toColumnId: relationshipComposer.targetColumnId,
        cardinalityFrom: relationshipComposer.cardinalityFrom,
        cardinalityTo: relationshipComposer.cardinalityTo,
        name: relationshipComposer.name,
      });
    } else if (relationshipDialog.relationshipId) {
      try {
        await updateRelationshipMutation.mutateAsync({
          diagramId,
          relationshipId: relationshipDialog.relationshipId,
          payload: {
            name: relationshipComposer.name || null,
            cardinality_from: relationshipComposer.cardinalityFrom,
            cardinality_to: relationshipComposer.cardinalityTo,
            on_update_action: "NO ACTION",
            on_delete_action: "NO ACTION",
          },
        });
        setStatusMessage("Relationship updated.");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to update relationship.";
        setStatusMessage(message);
        return;
      }
    }

    setRelationshipDialog({
      open: false,
      mode: "create",
      relationshipId: null,
    });
  }

  async function deleteRelationship(relationshipId: string) {
    if (!diagramId) {
      return;
    }
    try {
      await deleteRelationshipMutation.mutateAsync({
        diagramId,
        relationshipId,
      });
      setStatusMessage("Relationship deleted.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to delete relationship.";
      setStatusMessage(message);
    }
  }

  async function toggleVisibility() {
    if (!projectQuery.data) {
      return;
    }

    const nextVisibility =
      projectQuery.data.visibility === "public" ? "private" : "public";

    try {
      const updated = await updateProjectVisibilityMutation.mutateAsync({
        projectId: projectQuery.data.project_id,
        payload: {
          visibility: nextVisibility,
          allow_anonymous_edit: nextVisibility === "public",
        },
      });
      setStatusMessage(`Project visibility: ${updated.visibility}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update project visibility.";
      setStatusMessage(message);
    }
  }

  async function copyShareLink() {
    if (!shareSlug || typeof window === "undefined") {
      return;
    }
    const shareUrl = `${window.location.origin}/share/${shareSlug}`;
    await navigator.clipboard.writeText(shareUrl);
    setStatusMessage("Share link copied.");
  }

  function resetLocalSession() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(sessionStorageKey.workspaceId);
    window.localStorage.removeItem(sessionStorageKey.projectId);
    window.localStorage.removeItem(sessionStorageKey.diagramId);
    window.localStorage.removeItem(sessionStorageKey.shareSlug);
    window.location.href = "/";
  }

  async function importSchemaFromPostgres() {
    if (!diagramId) {
      return;
    }

    try {
      const result = await importPostgresMutation.mutateAsync({
        diagramId,
        payload: {
          host: importHost,
          port: importPort,
          database_name: importDatabase,
          username: importUser,
          password: importPassword,
          schema_name: importSchema,
        },
      });

      setStatusMessage(
        `Import done: tables=${result.table_count} columns=${result.column_count} relationships=${result.relationship_count}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to import schema.";
      setStatusMessage(message);
    }
  }

  async function exportSql() {
    if (!diagramId) {
      return;
    }

    try {
      const result = await exportSqlMutation.mutateAsync({
        diagramId,
        payload: {
          target_schema: exportSchema,
        },
      });
      setExportSqlOutput(result.sql_output);
      setStatusMessage(`Export done: ${result.statement_count} statements.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to export SQL.";
      setStatusMessage(message);
    }
  }

  async function createSnapshot() {
    if (!diagramId || !diagramQuery.data) {
      return;
    }

    try {
      const snapshot = await createSnapshotMutation.mutateAsync({
        diagramId,
        payload: {
          label: `snapshot_${new Date().toISOString()}`,
          snapshot_payload: diagramQuery.data as unknown as Record<
            string,
            unknown
          >,
        },
      });
      setStatusMessage(`Snapshot created: v${snapshot.version_no}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create snapshot.";
      setStatusMessage(message);
    }
  }

  if (projectQuery.isLoading || !workspaceId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="font-medium">Loading project workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-xl rounded-xl border border-rose-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-rose-700">
            Project access failed
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This project could not be loaded. Check the shared link or access.
          </p>
          <button
            type="button"
            onClick={resetLocalSession}
            className="mt-4 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Back To Home
          </button>
        </div>
      </div>
    );
  }

  const railMobileState = isMobileSidebarOpen
    ? "translate-x-0"
    : "-translate-x-full";
  const railDesktopState = isSidebarVisible
    ? "lg:translate-x-0"
    : "lg:-translate-x-full";
  const panelMobileState = isMobileSidebarOpen
    ? "left-[56px] translate-x-0 p-2"
    : "left-[56px] -translate-x-full overflow-hidden p-0";
  const panelDesktopState = isSidebarVisible
    ? "lg:left-[56px] lg:translate-x-0 lg:p-2"
    : "lg:left-[56px] lg:-translate-x-full lg:overflow-hidden lg:p-0";

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex h-10 items-center justify-between px-2 lg:px-3">
          <div className="flex min-w-0 items-center gap-2 text-base font-semibold">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((current) => !current)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              title="Toggle Sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarVisible((current) => !current)}
              className="hidden rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:inline-flex"
              title="Toggle Sidebar"
            >
              {isSidebarVisible ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            <span className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
              ERD
            </span>
            <span className="max-w-[220px] truncate lg:max-w-[380px]">
              {projectQuery.data.name}
            </span>
            <div className="ml-1 hidden items-center gap-1 text-xs font-medium text-slate-600 lg:flex">
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-slate-100"
              >
                Actions
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-slate-100"
              >
                View
              </button>
              <button
                type="button"
                className="rounded px-2 py-1 hover:bg-slate-100"
              >
                Help
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleVisibility}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            >
              {projectQuery.data.visibility === "public" ? (
                <Unlock className="h-4 w-4 text-emerald-600" />
              ) : (
                <Lock className="h-4 w-4 text-amber-600" />
              )}
              {projectQuery.data.visibility}
            </button>
            <button
              type="button"
              onClick={copyShareLink}
              disabled={!shareSlug}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              onClick={resetLocalSession}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="relative h-[calc(100vh-40px)] overflow-hidden">
        {isMobileSidebarOpen ? (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute inset-0 z-20 bg-slate-900/20 lg:hidden"
          />
        ) : null}

        <aside
          className={`absolute top-0 left-0 z-30 h-full w-14 border-r border-slate-200 bg-white py-2 transition-transform ${railMobileState} ${railDesktopState}`}
        >
          <div className="flex h-full flex-col items-center gap-1.5">
            <button
              type="button"
              className={`flex w-11 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] leading-none ${
                sidebarMode === "tables"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500"
              }`}
              onClick={() => setSidebarMode("tables")}
              title="Tables"
            >
              <Table2 className="h-4 w-4" />
              <span>Tables</span>
            </button>
            <button
              type="button"
              className={`flex w-11 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] leading-none ${
                sidebarMode === "relations"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500"
              }`}
              onClick={() => setSidebarMode("relations")}
              title="Relationships"
            >
              <Cable className="h-4 w-4" />
              <span>Refs</span>
            </button>
            <button
              type="button"
              className={`flex w-11 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] leading-none ${
                sidebarMode === "customTypes"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500"
              }`}
              onClick={() => setSidebarMode("customTypes")}
              title="Custom Types"
            >
              <FileCode2 className="h-4 w-4" />
              <span>Types</span>
            </button>
            <span className="my-1 h-px w-9 bg-slate-200" />
            <button
              type="button"
              className={`flex w-11 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] leading-none ${
                sidebarMode === "importExport"
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500"
              }`}
              onClick={() => setSidebarMode("importExport")}
              title="Import / Export"
            >
              <Upload className="h-4 w-4" />
              <span>I/O</span>
            </button>
          </div>
        </aside>

        <aside
          ref={sidebarRef}
          className={`absolute top-0 z-30 flex h-full min-h-0 flex-col gap-3 border-r border-slate-200 bg-white transition-all ${panelMobileState} ${panelDesktopState}`}
          style={{
            width: isMobileSidebarOpen
              ? `min(${sidebarPanelWidth}px, calc(100vw - 56px))`
              : isSidebarVisible
                ? `${sidebarPanelWidth}px`
                : "0px",
          }}
        >
          <section className="rounded-lg border border-slate-200 bg-white p-1.5">
            {sidebarMode === "customTypes" ? (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Custom Types
                </h3>
                <div className="max-h-[70vh] space-y-1 overflow-auto pr-1">
                  {customTypeOptions.map((typeName) => (
                    <div
                      key={typeName}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-700"
                    >
                      {typeName}
                    </div>
                  ))}
                </div>
              </div>
            ) : sidebarMode === "importExport" ? (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Import / Export
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={importHost}
                    onChange={(event) => setImportHost(event.target.value)}
                    placeholder="localhost"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  <input
                    value={importPort}
                    onChange={(event) =>
                      setImportPort(Number(event.target.value) || 5432)
                    }
                    placeholder="5432"
                    type="number"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  <input
                    value={importDatabase}
                    onChange={(event) => setImportDatabase(event.target.value)}
                    placeholder="database"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  <input
                    value={importUser}
                    onChange={(event) => setImportUser(event.target.value)}
                    placeholder="user"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  <input
                    value={importPassword}
                    onChange={(event) => setImportPassword(event.target.value)}
                    placeholder="password"
                    type="password"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  <input
                    value={importSchema}
                    onChange={(event) => setImportSchema(event.target.value)}
                    placeholder="public"
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => void importSchemaFromPostgres()}
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    <Database className="h-4 w-4" />
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={() => void createSnapshot()}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    <Save className="h-4 w-4" />
                    Snapshot
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-1.5">
                  <input
                    value={exportSchema}
                    onChange={(event) => setExportSchema(event.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => void exportSql()}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                </div>
                <textarea
                  value={exportSqlOutput}
                  onChange={() => undefined}
                  className="h-16 w-full rounded-md border border-slate-300 p-1.5 text-xs"
                  placeholder="SQL output"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSidebarMode("tables")}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                      sidebarMode === "tables"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Tables
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarMode("relations")}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                      sidebarMode === "relations"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    Refs
                  </button>
                </div>

                {sidebarMode === "tables" ? (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-1.5">
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-2 left-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          value={tableFilter}
                          onChange={(event) =>
                            setTableFilter(event.target.value)
                          }
                          placeholder="Filter"
                          className="w-full rounded-md border border-slate-300 px-6 py-1.5 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => openCreateTableDialog()}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        <Table2 className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>

                    <div className="max-h-[52vh] space-y-1 overflow-auto pr-1">
                      {filteredTables.map((table) => {
                        const isExpanded =
                          expandedTables[table.table_id] ?? false;
                        const isSelected = table.table_id === selectedTableId;
                        const columnDraft = newColumnByTable[
                          table.table_id
                        ] ?? {
                          name: "",
                          dataType: "text",
                          isNullable: true,
                        };

                        return (
                          <div
                            key={table.table_id}
                            className={`overflow-hidden rounded-lg border ${
                              isSelected
                                ? "border-blue-400"
                                : "border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTables((current) => ({
                                    ...current,
                                    [table.table_id]: !isExpanded,
                                  }))
                                }
                                className="rounded p-1 text-slate-500 hover:bg-slate-200"
                              >
                                <ChevronDown
                                  className={`h-4 w-4 transition-transform ${
                                    isExpanded ? "rotate-0" : "-rotate-90"
                                  }`}
                                />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTableId(table.table_id);
                                  setExpandedTables((current) => ({
                                    ...current,
                                    [table.table_id]: true,
                                  }));
                                }}
                                className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold"
                              >
                                {table.display_name ?? table.table_name}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditTableDialog(table.table_id)
                                }
                                className="rounded p-1 text-slate-500 hover:bg-slate-200"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  openCreateRelationshipDialog(table.table_id)
                                }
                                className="rounded p-1 text-slate-500 hover:bg-slate-200"
                              >
                                <Link2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteTable(table.table_id)}
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {isExpanded ? (
                              <div className="space-y-1 border-t border-slate-200 bg-white p-1.5 flex flex-col">
                                <div className="pt-0.5">
                                  <div className="mb-1 text-xs font-semibold text-slate-600">
                                    Comments
                                  </div>
                                  <textarea
                                    value={tableComments[table.table_id] ?? ""}
                                    onChange={(event) =>
                                      setTableComments((current) => ({
                                        ...current,
                                        [table.table_id]: event.target.value,
                                      }))
                                    }
                                    placeholder="No comments"
                                    className="h-12 w-full rounded-md border border-slate-300 p-1.5 text-xs outline-none focus:border-blue-500"
                                  />
                                </div>

                                <div className="mt-1 pt-1 border-t border-slate-200">
                                  <div className="text-xs font-semibold text-slate-600 mb-1">
                                    Fields
                                  </div>

                                  <div className="overflow-x-auto">
                                    <div className="space-y-1 min-w-min">
                                      {table.columns.map((column) => {
                                    const draftName =
                                      columnNameDrafts[column.column_id] ??
                                      column.column_name;
                                    const nullableLabel = column.is_nullable
                                      ? "?"
                                      : "N";

                                    return (
                                      <div
                                        key={column.column_id}
                                        className="grid grid-cols-[1fr_100px_32px_32px_32px] gap-1"
                                      >
                                        <input
                                          value={draftName}
                                          onChange={(event) =>
                                            setColumnNameDrafts((current) => ({
                                              ...current,
                                              [column.column_id]:
                                                event.target.value,
                                            }))
                                          }
                                          onBlur={() => {
                                            const nextValue = (
                                              columnNameDrafts[
                                                column.column_id
                                              ] ?? ""
                                            ).trim();
                                            if (
                                              nextValue &&
                                              nextValue !== column.column_name
                                            ) {
                                              void updateColumn(
                                                table.table_id,
                                                column.column_id,
                                                {
                                                  column_name: nextValue,
                                                },
                                              );
                                            }
                                          }}
                                          className="rounded-md border border-slate-300 px-2 py-0.5 text-xs outline-none focus:border-blue-500"
                                        />

                                        <select
                                          value={column.data_type}
                                          onChange={(event) => {
                                            void updateColumn(
                                              table.table_id,
                                              column.column_id,
                                              {
                                                data_type: event.target.value,
                                              },
                                            );
                                          }}
                                          className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-blue-500"
                                        >
                                          {postgresTypeOptions.map((option) => (
                                            <option key={option} value={option}>
                                              {option}
                                            </option>
                                          ))}
                                        </select>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            void updateColumn(
                                              table.table_id,
                                              column.column_id,
                                              {
                                                is_nullable: !column.is_nullable,
                                              },
                                            )
                                          }
                                          className="rounded-md border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                          title="Toggle nullable"
                                        >
                                          {nullableLabel}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            void updateColumn(
                                              table.table_id,
                                              column.column_id,
                                              {
                                                is_primary_key:
                                                  !column.is_primary_key,
                                              },
                                            )
                                          }
                                          className={`rounded-md border border-slate-300 p-1 ${
                                            column.is_primary_key
                                              ? "bg-amber-50 text-amber-600"
                                              : "text-slate-500 hover:bg-slate-50"
                                          }`}
                                          title="Toggle primary key"
                                        >
                                          <KeyRound className="mx-auto h-3.5 w-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            openFieldAttributes(table, column)
                                          }
                                          className="rounded-md border border-slate-300 p-1 text-slate-500 hover:bg-slate-50 text-xs font-bold"
                                          title="Field attributes"
                                        >
                                          ...
                                        </button>
                                      </div>
                                    );
                                  })}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-[1fr_100px_auto_auto] gap-1 pt-1 min-w-min overflow-x-auto">
                                    <input
                                      value={columnDraft.name}
                                      onChange={(event) =>
                                        setNewColumnDraft(table.table_id, {
                                          name: event.target.value,
                                        })
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          void addColumnToTable(table.table_id);
                                        }
                                      }}
                                      onBlur={() => {
                                        void addColumnToTable(table.table_id);
                                      }}
                                      placeholder="column_name"
                                      className="rounded-md border border-slate-300 px-2 py-0.5 text-xs outline-none focus:border-blue-500"
                                    />

                                    <select
                                      value={columnDraft.dataType}
                                      onChange={(event) =>
                                        setNewColumnDraft(table.table_id, {
                                          dataType: event.target.value,
                                        })
                                      }
                                      className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-blue-500"
                                    >
                                      {postgresTypeOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>

                                    <label className="inline-flex items-center justify-center rounded-md border border-slate-300 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={columnDraft.isNullable}
                                        onChange={(event) =>
                                          setNewColumnDraft(table.table_id, {
                                            isNullable: event.target.checked,
                                          })
                                        }
                                        className="h-3 w-3"
                                      />
                                    </label>
                                    <div className="inline-flex items-center justify-center rounded-md border border-dashed border-slate-300 px-1 text-[10px] text-slate-400">
                                      ↵
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-[1fr_auto] gap-1.5">
                      <div className="relative">
                        <Search className="pointer-events-none absolute top-2 left-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          value={relationFilter}
                          onChange={(event) =>
                            setRelationFilter(event.target.value)
                          }
                          placeholder="Filter"
                          className="w-full rounded-md border border-slate-300 px-6 py-1.5 text-xs outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          openCreateRelationshipDialog(selectedTableId);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Add
                      </button>
                    </div>

                    <div className="max-h-[34vh] space-y-1 overflow-auto pr-1">
                      {filteredRelationships.map((relationship) => {
                        const isExpanded =
                          expandedRelationships[relationship.relationship_id];
                        const fromTable = tables.find(
                          (table) =>
                            table.table_id === relationship.from_table_id,
                        );
                        const toTable = tables.find(
                          (table) =>
                            table.table_id === relationship.to_table_id,
                        );

                        return (
                          <div
                            key={relationship.relationship_id}
                            className="rounded-lg border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRelationships((current) => ({
                                  ...current,
                                  [relationship.relationship_id]: !isExpanded,
                                }))
                              }
                              className="flex w-full items-center justify-between gap-2 bg-slate-50 px-2 py-1.5 text-left"
                            >
                              <span className="truncate text-xs font-semibold">
                                {relationship.name}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">
                                  {relationship.cardinality_from}:
                                  {relationship.cardinality_to}
                                </span>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditRelationshipDialog(
                                      relationship.relationship_id,
                                    );
                                  }}
                                  className="rounded p-1 text-slate-500 hover:bg-slate-200"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void deleteRelationship(
                                      relationship.relationship_id,
                                    );
                                  }}
                                  className="rounded p-1 text-red-600 hover:bg-red-100"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </button>

                            {isExpanded ? (
                              <div className="space-y-1 border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
                                <div>
                                  From:{" "}
                                  {fromTable?.table_name ??
                                    relationship.from_table_id}
                                </div>
                                <div>
                                  To:{" "}
                                  {toTable?.table_name ??
                                    relationship.to_table_id}
                                </div>
                                <div>
                                  Update: {relationship.on_update_action}
                                </div>
                                <div>
                                  Delete: {relationship.on_delete_action}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openCreateRelationshipDialog(selectedTableId)
                      }
                      className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Add Rel
                    </button>
                  </div>
                )}
              </>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 text-xs text-slate-700">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <span className="truncate">{statusMessage}</span>
            </div>
            <div className="mt-1 text-[10px] leading-tight text-slate-500">
              <div className="truncate">WS: {workspaceId.slice(0, 8)}</div>
              <div className="truncate">Proj: {projectId.slice(0, 8)}</div>
            </div>
          </section>

          {isSidebarVisible && (
            <div
              onMouseDown={() => setIsResizing(true)}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-slate-200 hover:bg-blue-500 transition-colors"
              style={{ cursor: isResizing ? "col-resize" : "col-resize" }}
            />
          )}
        </aside>

        <section
          className="absolute inset-0"
          style={{
            paddingLeft:
              isSidebarVisible || isMobileSidebarOpen
                ? `${56 + sidebarPanelWidth}px`
                : "56px",
          }}
        >
          <div className="h-full min-h-[500px]">
            <DiagramCanvas
              diagram={diagramQuery.data}
              selectedTableId={selectedTableId}
              onSelectTable={(tableId) => {
                setSelectedTableId(tableId);
                setExpandedTables((current) => ({
                  ...current,
                  [tableId]: true,
                }));
              }}
              onTablePositionChange={updateTablePosition}
              onCreateTableAt={(position) => openCreateTableDialog(position)}
              onCreateRelationshipRequest={() => {
                openCreateRelationshipDialog(selectedTableId);
              }}
              onEditTable={openEditTableDialog}
              onDuplicateTable={(tableId) => void duplicateTable(tableId)}
              onDeleteTable={(tableId) => void deleteTable(tableId)}
              onAddRelationshipFromTable={(tableId) => {
                openCreateRelationshipDialog(tableId);
              }}
              onManualConnect={(connection) => {
                openCreateRelationshipDialog(
                  connection.fromTableId,
                  connection.toTableId,
                );
                setRelationshipComposer((current) => ({
                  ...current,
                  sourceColumnId: connection.fromColumnId,
                  targetColumnId: connection.toColumnId,
                }));
              }}
              onPairTableRequest={(sourceTableId, targetTableId) => {
                openCreateRelationshipDialog(sourceTableId, targetTableId);
              }}
            />
          </div>
        </section>
      </main>

      {tableDialog.open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {tableDialog.mode === "create" ? "New Table" : "Edit Table"}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setTableDialog((current) => ({ ...current, open: false }))
                }
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="mb-1 block text-xs font-semibold text-slate-600">
                    Schema
                  </p>
                  <input
                    value={tableDialog.schemaName}
                    onChange={(event) =>
                      setTableDialog((current) => ({
                        ...current,
                        schemaName: event.target.value,
                      }))
                    }
                    disabled={tableDialog.mode === "edit"}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <p className="mb-1 block text-xs font-semibold text-slate-600">
                    Table Name
                  </p>
                  <input
                    value={tableDialog.tableName}
                    onChange={(event) =>
                      setTableDialog((current) => ({
                        ...current,
                        tableName: event.target.value,
                      }))
                    }
                    disabled={tableDialog.mode === "edit"}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div>
                <p className="mb-1 block text-xs font-semibold text-slate-600">
                  Display Name
                </p>
                <input
                  value={tableDialog.displayName}
                  onChange={(event) =>
                    setTableDialog((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <p className="mb-1 block text-xs font-semibold text-slate-600">
                  Color
                </p>
                <div className="flex gap-2">
                  {tableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() =>
                        setTableDialog((current) => ({
                          ...current,
                          colorHex: color,
                        }))
                      }
                      className={`h-8 w-8 rounded-md border-2 ${
                        tableDialog.colorHex === color
                          ? "border-slate-900"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setTableDialog((current) => ({ ...current, open: false }))
                }
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveTableDialog()}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {relationshipDialog.open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {relationshipDialog.mode === "create"
                  ? "New Relationship"
                  : "Edit Relationship"}
              </h3>
              <button
                type="button"
                onClick={() =>
                  setRelationshipDialog({
                    open: false,
                    mode: "create",
                    relationshipId: null,
                  })
                }
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <input
                value={relationshipComposer.name}
                onChange={(event) =>
                  setRelationshipComposer((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="fk_name (optional)"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={relationshipComposer.sourceTableId}
                  onChange={(event) =>
                    updateRelationshipSource(event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Source table</option>
                  {tables.map((table) => (
                    <option key={table.table_id} value={table.table_id}>
                      {table.display_name ?? table.table_name}
                    </option>
                  ))}
                </select>

                <select
                  value={relationshipComposer.targetTableId}
                  onChange={(event) =>
                    updateRelationshipTarget(event.target.value)
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Target table</option>
                  {tables
                    .filter(
                      (table) =>
                        table.table_id !== relationshipComposer.sourceTableId,
                    )
                    .map((table) => (
                      <option key={table.table_id} value={table.table_id}>
                        {table.display_name ?? table.table_name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={relationshipComposer.sourceColumnId}
                  onChange={(event) =>
                    setRelationshipComposer((current) => ({
                      ...current,
                      sourceColumnId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Source column</option>
                  {(
                    tables.find(
                      (table) =>
                        table.table_id === relationshipComposer.sourceTableId,
                    )?.columns ?? []
                  ).map((column) => (
                    <option key={column.column_id} value={column.column_id}>
                      {column.column_name}
                    </option>
                  ))}
                </select>

                <select
                  value={relationshipComposer.targetColumnId}
                  onChange={(event) =>
                    setRelationshipComposer((current) => ({
                      ...current,
                      targetColumnId: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Target column</option>
                  {(
                    tables.find(
                      (table) =>
                        table.table_id === relationshipComposer.targetTableId,
                    )?.columns ?? []
                  ).map((column) => (
                    <option key={column.column_id} value={column.column_id}>
                      {column.column_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={relationshipComposer.cardinalityFrom}
                  onChange={(event) =>
                    setRelationshipComposer((current) => ({
                      ...current,
                      cardinalityFrom: event.target.value as "1" | "N",
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="1">From: 1</option>
                  <option value="N">From: N</option>
                </select>
                <select
                  value={relationshipComposer.cardinalityTo}
                  onChange={(event) =>
                    setRelationshipComposer((current) => ({
                      ...current,
                      cardinalityTo: event.target.value as "1" | "N",
                    }))
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="1">To: 1</option>
                  <option value="N">To: N</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-between gap-2">
              {relationshipDialog.mode === "edit" &&
              relationshipDialog.relationshipId ? (
                <button
                  type="button"
                  onClick={() => {
                    const relationId = relationshipDialog.relationshipId;
                    if (relationId) {
                      void deleteRelationship(relationId);
                    }
                    setRelationshipDialog({
                      open: false,
                      mode: "create",
                      relationshipId: null,
                    });
                  }}
                  className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setRelationshipDialog({
                      open: false,
                      mode: "create",
                      relationshipId: null,
                    })
                  }
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveRelationshipDialog()}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {fieldAttributesDraft ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Field Attributes</h3>
              <button
                type="button"
                onClick={() => setFieldAttributesDraft(null)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldAttributesDraft.unique}
                    onChange={(event) =>
                      setFieldAttributesDraft((current) =>
                        current
                          ? {
                              ...current,
                              unique: event.target.checked,
                            }
                          : current,
                      )
                    }
                  />
                  Unique
                </label>

                <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldAttributesDraft.autoIncrement}
                    onChange={(event) =>
                      setFieldAttributesDraft((current) =>
                        current
                          ? {
                              ...current,
                              autoIncrement: event.target.checked,
                            }
                          : current,
                      )
                    }
                  />
                  Auto Increment
                </label>
              </div>

              <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={fieldAttributesDraft.array}
                  onChange={(event) =>
                    setFieldAttributesDraft((current) =>
                      current
                        ? {
                            ...current,
                            array: event.target.checked,
                          }
                        : current,
                    )
                  }
                />
                Array
              </label>

              <div>
                <p className="mb-1 block text-xs font-semibold text-slate-600">
                  Default Value
                </p>
                <input
                  value={fieldAttributesDraft.defaultValue}
                  onChange={(event) =>
                    setFieldAttributesDraft((current) =>
                      current
                        ? {
                            ...current,
                            defaultValue: event.target.value,
                          }
                        : current,
                    )
                  }
                  placeholder="No default"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <p className="mb-1 block text-xs font-semibold text-slate-600">
                  Comments
                </p>
                <textarea
                  value={fieldAttributesDraft.comments}
                  onChange={(event) =>
                    setFieldAttributesDraft((current) =>
                      current
                        ? {
                            ...current,
                            comments: event.target.value,
                          }
                        : current,
                    )
                  }
                  placeholder="No comments"
                  className="h-20 w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFieldAttributesDraft(null)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveFieldAttributes()}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isWorking ? (
        <div className="pointer-events-none fixed right-4 bottom-4 z-40 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
          Working...
        </div>
      ) : null}
    </div>
  );
}
