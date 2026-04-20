"use client";

import {
  Activity,
  ArrowDown,
  ArrowUp,
  Cable,
  ChevronDown,
  Copy,
  Database,
  Download,
  FileCode2,
  GripVertical,
  KeyRound,
  Link2,
  Menu,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useSessionProvider } from "@/components/providers/SessionProvider";
import { useCreateDiagramMutation } from "@/hooks/diagram/useCreateDiagramMutation";
import { useCreateSnapshotMutation } from "@/hooks/diagram/useCreateSnapshotMutation";
import { useGetDiagramQuery } from "@/hooks/diagram/useGetDiagramQuery";
import { useListDiagramsByWorkspaceQuery } from "@/hooks/diagram/useListDiagramsByWorkspaceQuery";
import { useExportDictionaryMutation } from "@/hooks/export/useExportDictionaryMutation";
import { useExportSqlMutation } from "@/hooks/export/useExportSqlMutation";
import { useImportPostgresMutation } from "@/hooks/import/useImportPostgresMutation";
import { useImportSqlFileMutation } from "@/hooks/import/useImportSqlFileMutation";
import { useImportSqlRawMutation } from "@/hooks/import/useImportSqlRawMutation";
import { useListPostgresSchemasMutation } from "@/hooks/import/useListPostgresSchemasMutation";
import { useTestPostgresConnectionMutation } from "@/hooks/import/useTestPostgresConnectionMutation";
import { useDuplicateProjectMutation } from "@/hooks/project/useDuplicateProjectMutation";
import { useGetProjectQuery } from "@/hooks/project/useGetProjectQuery";
import { useUpdateProjectMutation } from "@/hooks/project/useUpdateProjectMutation";
import { useUpdateProjectVisibilityMutation } from "@/hooks/project/useUpdateProjectVisibilityMutation";
import { useCreateColumnMutation } from "@/hooks/schemaEditor/useCreateColumnMutation";
import { useCreateCustomTypeMutation } from "@/hooks/schemaEditor/useCreateCustomTypeMutation";
import { useCreateIndexMutation } from "@/hooks/schemaEditor/useCreateIndexMutation";
import { useCreateRelationshipMutation } from "@/hooks/schemaEditor/useCreateRelationshipMutation";
import { useCreateTableMutation } from "@/hooks/schemaEditor/useCreateTableMutation";
import { useDeleteColumnMutation } from "@/hooks/schemaEditor/useDeleteColumnMutation";
import { useDeleteCustomTypeMutation } from "@/hooks/schemaEditor/useDeleteCustomTypeMutation";
import { useDeleteIndexMutation } from "@/hooks/schemaEditor/useDeleteIndexMutation";
import { useDeleteRelationshipMutation } from "@/hooks/schemaEditor/useDeleteRelationshipMutation";
import { useUpdateColumnMutation } from "@/hooks/schemaEditor/useUpdateColumnMutation";
import { useUpdateCustomTypeMutation } from "@/hooks/schemaEditor/useUpdateCustomTypeMutation";
import { useUpdateIndexMutation } from "@/hooks/schemaEditor/useUpdateIndexMutation";
import { useUpdateRelationshipMutation } from "@/hooks/schemaEditor/useUpdateRelationshipMutation";
import { useUpdateTableMutation } from "@/hooks/schemaEditor/useUpdateTableMutation";
import { useListWorkspacesQuery } from "@/hooks/workspace/useListWorkspacesQuery";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  clearStoredProjectContext,
  setStoredProjectContext,
} from "@/lib/authStorage";
import type {
  ColumnResponse,
  CustomTypeResponse,
  DiagramDetailResponse,
  DictionaryExportFileType,
  DictionaryExportLayout,
  IndexMutationResponse,
  PostgresConnectionRequest,
  TableResponse,
} from "@/lib/types";

import { CreateProjectDialog } from "../projects/CreateProjectDialog";
import { DiagramCanvas } from "./diagramCanvas/DiagramCanvas";
import {
  getAvailableShareAccessOptions,
  type ShareAccessOption,
  toShareAccessOption,
  toVisibilityPayload,
} from "./shareAccess";

type SidebarMode = "tables" | "relations" | "customTypes" | "importExport";
type TableDialogMode = "create" | "edit";
type RelationshipDialogMode = "create" | "edit";
type ProjectView = "erd" | "dictionary";
type ExportDialogTab = "sql" | "csv";
type ImportDialogTab = "database" | "upload" | "paste";

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
  "uuid",
  "timestamp",
  "timestamptz",
  "jsonb",
  "bytea",
];
const indexMethodOptions = [
  "btree",
  "hash",
  "gin",
  "gist",
  "brin",
  "spgist",
] as const;

const dialogFieldIdPrefix = "dialog-field-";
const emptyTables: TableResponse[] = [];
const emptyRelationships: DiagramDetailResponse["relationships"] = [];
const emptyCustomTypes: CustomTypeResponse[] = [];
const DEFAULT_DICTIONARY_COLUMN_WIDTH = 320;
type DictionaryHeaderKey =
  | "drag"
  | "key"
  | "column"
  | "type"
  | "notNull"
  | "default"
  | "example"
  | "description"
  | "actions";
const MAX_DICTIONARY_COLUMN_WIDTH = 900;
const dictionaryHeaderDefaults: Record<DictionaryHeaderKey, number> = {
  drag: 44,
  key: 88,
  column: DEFAULT_DICTIONARY_COLUMN_WIDTH,
  type: 120,
  notNull: 120,
  default: 220,
  example: 190,
  description: 210,
  actions: 150,
};
const dictionaryHeaderMins: Record<DictionaryHeaderKey, number> = {
  drag: 40,
  key: 70,
  column: 180,
  type: 100,
  notNull: 100,
  default: 160,
  example: 140,
  description: 160,
  actions: 130,
};

interface DashboardProps {
  projectId: string;
  initialShareSlug?: string | null;
  initialView?: ProjectView;
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

interface TableDialogFieldDraft {
  localId: string;
  columnId: string | null;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isUnique: boolean;
}

interface NormalizedTableDialogField extends TableDialogFieldDraft {
  ordinalPosition: number;
}

interface FieldAttributesDraft {
  tableId: string;
  columnId: string;
  primaryKey: boolean;
  unique: boolean;
  autoIncrement: boolean;
  array: boolean;
  isNullable: boolean;
  defaultValue: string;
  example: string;
  comments: string;
  baseType: string;
}

interface IndexEditorDraft {
  tableId: string;
  mode: "create" | "edit";
  indexId: string | null;
  indexName: string;
  method: (typeof indexMethodOptions)[number];
  isUnique: boolean;
  commentText: string;
  selectedColumnIds: string[];
  columnSearch: string;
}

interface CustomTypeEditorState {
  open: boolean;
  mode: "create" | "edit";
  customTypeId: string | null;
  schemaName: string;
  typeName: string;
  enumValuesText: string;
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

type ConnectionCheckStatus = "idle" | "success" | "failed";

function normalizeTableName(name: string, fallback: string) {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function makeDialogFieldId() {
  return `${dialogFieldIdPrefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapColumnToDialogField(column: ColumnResponse): TableDialogFieldDraft {
  return {
    localId: `column-${column.column_id}`,
    columnId: column.column_id,
    columnName: column.column_name,
    dataType: getColumnTypeName(column),
    isNullable: column.is_nullable,
    isPrimaryKey: column.is_primary_key,
    isUnique: column.is_unique,
  };
}

function randomColor() {
  return tableColors[0] ?? "#65d5b8";
}

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

function parseCustomTypeValuesInput(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
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

function buildColumnTypePayload(
  typeName: string,
  customTypeNames: Set<string>,
) {
  const normalized = typeName.trim() || "text";
  const isArray = normalized.endsWith("[]");
  const baseType = removeArraySuffix(normalized).trim();

  if (customTypeNames.has(baseType)) {
    return {
      data_type: isArray ? "USER-DEFINED[]" : "USER-DEFINED",
      udt_name: baseType,
    };
  }

  return {
    data_type: normalized,
    udt_name: null,
  };
}

function inferAutoIncrement(defaultSql: string | null) {
  if (!defaultSql) {
    return false;
  }
  const normalized = defaultSql.toLowerCase();
  return normalized.includes("identity") || normalized.includes("nextval");
}

function isIdentityCompatibleType(dataType: string) {
  const normalized = normalizeTypeForComparison(removeArraySuffix(dataType));
  return ["int", "bigint"].includes(normalized);
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

function quoteIdentifier(identifier: string) {
  if (/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    return identifier;
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

function sortIndexes(indexes: IndexMutationResponse[]) {
  return [...indexes].sort((left, right) => {
    const sourceOrder =
      left.source === right.source ? 0 : left.source === "user" ? -1 : 1;
    if (sourceOrder !== 0) {
      return sourceOrder;
    }
    return left.index_name.localeCompare(right.index_name);
  });
}

function buildIndexSqlPreview(
  table: TableResponse,
  draft: Pick<
    IndexEditorDraft,
    "indexName" | "method" | "isUnique" | "selectedColumnIds"
  >,
) {
  const orderedColumns = draft.selectedColumnIds
    .map((columnId) =>
      table.columns.find((column) => column.column_id === columnId),
    )
    .filter((column): column is ColumnResponse => Boolean(column));

  if (!draft.indexName.trim() || orderedColumns.length === 0) {
    return "-- Add index name and at least one column";
  }

  const uniqueClause = draft.isUnique ? "UNIQUE " : "";
  const renderedColumns = orderedColumns
    .map((column) => quoteIdentifier(column.column_name))
    .join(", ");

  return `CREATE ${uniqueClause}INDEX ${quoteIdentifier(draft.indexName.trim())}
ON ${quoteIdentifier(table.schema_name)}.${quoteIdentifier(table.table_name)}
USING ${draft.method} (${renderedColumns});`;
}

export function Dashboard({
  projectId,
  initialShareSlug,
  initialView = "erd",
}: DashboardProps) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState(
    initialShareSlug ? "" : projectId,
  );
  const [workspaceId, setWorkspaceId] = useState("");
  const [diagramId, setDiagramId] = useState("");
  const [shareSlug, setShareSlug] = useState(initialShareSlug ?? "");

  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isDuplicateProjectOpen, setIsDuplicateProjectOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareAccessOption, setShareAccessOption] =
    useState<ShareAccessOption>("onlyMe");
  const [duplicateProjectName, setDuplicateProjectName] = useState("");
  const [duplicateProjectError, setDuplicateProjectError] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const [statusMessage, setStatusMessage] = useState("Loading project...");
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>("tables");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sidebarPanelWidth, setSidebarPanelWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const projectNameInputRef = useRef<HTMLInputElement>(null);
  const sidebarRenameInputRef = useRef<HTMLInputElement>(null);
  const [tableFilter, setTableFilter] = useState("");
  const [relationFilter, setRelationFilter] = useState("");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState("");

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
  const [tableDialogFields, setTableDialogFields] = useState<
    TableDialogFieldDraft[]
  >([]);
  const [tableDialogOriginalColumns, setTableDialogOriginalColumns] = useState<
    ColumnResponse[]
  >([]);
  const [customTypeEditor, setCustomTypeEditor] =
    useState<CustomTypeEditorState>({
      open: false,
      mode: "create",
      customTypeId: null,
      schemaName: "public",
      typeName: "",
      enumValuesText: "",
    });

  const [fieldAttributesDraft, setFieldAttributesDraft] =
    useState<FieldAttributesDraft | null>(null);
  const [indexEditorDraft, setIndexEditorDraft] =
    useState<IndexEditorDraft | null>(null);

  const [tableComments, setTableComments] = useState<Record<string, string>>(
    {},
  );
  const [columnComments, setColumnComments] = useState<Record<string, string>>(
    {},
  );
  const [columnNameDrafts, setColumnNameDrafts] = useState<
    Record<string, string>
  >({});
  const [columnDefaultDrafts, setColumnDefaultDrafts] = useState<
    Record<string, string>
  >({});
  const [columnExampleDrafts, setColumnExampleDrafts] = useState<
    Record<string, string>
  >({});
  const [dictionaryHeaderWidths, setDictionaryHeaderWidths] = useState<
    Record<DictionaryHeaderKey, number>
  >(dictionaryHeaderDefaults);
  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<{
    tableId: string;
    columnId: string;
  } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const columnResizeRef = useRef<{
    key: DictionaryHeaderKey;
    startX: number;
    startWidth: number;
    latestWidth: number;
  } | null>(null);
  const [activeFieldRow, setActiveFieldRow] = useState<{
    tableId: string;
    rowId: string;
  } | null>(null);
  const [openNewFieldTableId, setOpenNewFieldTableId] = useState<string | null>(
    null,
  );
  const [openTableActionsMenuId, setOpenTableActionsMenuId] = useState<
    string | null
  >(null);
  const [editingSidebarTableId, setEditingSidebarTableId] = useState<
    string | null
  >(null);
  const [editingSidebarTableName, setEditingSidebarTableName] = useState("");

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
  const [importSslMode, setImportSslMode] = useState("prefer");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importDialogTab, setImportDialogTab] =
    useState<ImportDialogTab>("database");
  const [importSqlText, setImportSqlText] = useState("");
  const [importSqlFile, setImportSqlFile] = useState<File | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [connectionCheckStatus, setConnectionCheckStatus] =
    useState<ConnectionCheckStatus>("idle");
  const [connectionCheckMessage, setConnectionCheckMessage] = useState("");
  const [availableImportSchemas, setAvailableImportSchemas] = useState<
    string[]
  >([]);
  const [selectedImportSchemas, setSelectedImportSchemas] = useState<string[]>(
    [],
  );
  const [importAllSchemas, setImportAllSchemas] = useState(true);
  const [testedImportConnectionKey, setTestedImportConnectionKey] = useState<
    string | null
  >(null);
  const [exportAllSchemas, setExportAllSchemas] = useState(true);
  const [selectedExportSchemas, setSelectedExportSchemas] = useState<string[]>(
    [],
  );
  const [exportSchema, setExportSchema] = useState("public");
  const [exportSqlOutput, setExportSqlOutput] = useState("");
  const [exportDialogTab, setExportDialogTab] =
    useState<ExportDialogTab>("sql");
  const [dictionaryLayout, setDictionaryLayout] =
    useState<DictionaryExportLayout>("table_grid");
  const [dictionaryFileType, setDictionaryFileType] =
    useState<DictionaryExportFileType>("csv");

  const attemptedDiagramCreateKeyRef = useRef<string | null>(null);

  const { isSessionRecoveryPending, sessionQuery } = useSessionProvider();
  const isAuthenticated = Boolean(sessionQuery.data?.user);
  const { data: workspaces = [] } = useListWorkspacesQuery(isAuthenticated);
  const duplicateProjectMutation = useDuplicateProjectMutation();

  const projectQuery = useGetProjectQuery(activeProjectId);
  const createDiagramMutation = useCreateDiagramMutation();
  const listDiagramsQuery = useListDiagramsByWorkspaceQuery(workspaceId);
  const diagramQuery = useGetDiagramQuery(diagramId);

  const createTableMutation = useCreateTableMutation();
  const updateTableMutation = useUpdateTableMutation();
  const createColumnMutation = useCreateColumnMutation();
  const deleteColumnMutation = useDeleteColumnMutation();
  const updateColumnMutation = useUpdateColumnMutation();
  const createIndexMutation = useCreateIndexMutation();
  const updateIndexMutation = useUpdateIndexMutation();
  const deleteIndexMutation = useDeleteIndexMutation();
  const createCustomTypeMutation = useCreateCustomTypeMutation();
  const updateCustomTypeMutation = useUpdateCustomTypeMutation();
  const deleteCustomTypeMutation = useDeleteCustomTypeMutation();
  const createRelationshipMutation = useCreateRelationshipMutation();
  const updateRelationshipMutation = useUpdateRelationshipMutation();
  const deleteRelationshipMutation = useDeleteRelationshipMutation();

  const updateProjectMutation = useUpdateProjectMutation();
  const updateProjectVisibilityMutation = useUpdateProjectVisibilityMutation();
  const testPostgresConnectionMutation = useTestPostgresConnectionMutation();
  const listPostgresSchemasMutation = useListPostgresSchemasMutation();
  const importPostgresMutation = useImportPostgresMutation();
  const importSqlRawMutation = useImportSqlRawMutation();
  const importSqlFileMutation = useImportSqlFileMutation();
  const exportSqlMutation = useExportSqlMutation();
  const exportDictionaryMutation = useExportDictionaryMutation();
  const createSnapshotMutation = useCreateSnapshotMutation();

  const tables = diagramQuery.data?.tables ?? emptyTables;
  const relationships = diagramQuery.data?.relationships ?? emptyRelationships;
  const customTypes = diagramQuery.data?.custom_types ?? emptyCustomTypes;
  const isDataDictionaryView = initialView === "dictionary";
  const availableExportSchemas = useMemo(() => {
    return [...new Set(tables.map((table) => table.schema_name))].sort(
      (left, right) => left.localeCompare(right),
    );
  }, [tables]);
  const selectedSourceExportSchemas = useMemo(() => {
    if (exportAllSchemas) {
      return availableExportSchemas;
    }
    return selectedExportSchemas;
  }, [availableExportSchemas, exportAllSchemas, selectedExportSchemas]);

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
    const fromColumns = new Set<string>(
      customTypes.map((customType) => customType.type_name),
    );
    for (const table of tables) {
      for (const column of table.columns) {
        const baseType = removeArraySuffix(getColumnTypeName(column));
        if (baseType && !postgresTypeOptions.includes(baseType)) {
          fromColumns.add(baseType);
        }
      }
    }

    return [...postgresTypeOptions, ...[...fromColumns].sort()];
  }, [customTypes, tables]);

  const customTypeNameSet = useMemo(
    () => new Set(customTypes.map((customType) => customType.type_name)),
    [customTypes],
  );

  const customTypeUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const table of tables) {
      for (const column of table.columns) {
        const baseType = removeArraySuffix(getColumnTypeName(column));
        if (!postgresTypeOptions.includes(baseType)) {
          counts[baseType] = (counts[baseType] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [tables]);

  useEffect(() => {
    setSelectedExportSchemas((current) => {
      const next = exportAllSchemas
        ? availableExportSchemas
        : current.filter((schema) => availableExportSchemas.includes(schema));

      if (
        current.length === next.length &&
        current.every((schema, index) => schema === next[index])
      ) {
        return current;
      }
      return next;
    });
  }, [availableExportSchemas, exportAllSchemas]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-table-actions-menu='true']")) {
        return;
      }
      setOpenTableActionsMenuId(null);
    };

    document.addEventListener("mousedown", onDocumentMouseDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!editingSidebarTableId) {
      return;
    }
    sidebarRenameInputRef.current?.focus();
    sidebarRenameInputRef.current?.select();
  }, [editingSidebarTableId]);

  useEffect(() => {
    if (!isEditingProjectName) {
      return;
    }
    projectNameInputRef.current?.focus();
    projectNameInputRef.current?.select();
  }, [isEditingProjectName]);

  useEffect(() => {
    if (!projectQuery.data?.name || isEditingProjectName) {
      return;
    }
    setEditingProjectName(projectQuery.data.name);
  }, [projectQuery.data?.name, isEditingProjectName]);

  const isWorking =
    updateProjectMutation.isPending ||
    createDiagramMutation.isPending ||
    createTableMutation.isPending ||
    updateTableMutation.isPending ||
    createColumnMutation.isPending ||
    deleteColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    createCustomTypeMutation.isPending ||
    updateCustomTypeMutation.isPending ||
    deleteCustomTypeMutation.isPending ||
    createRelationshipMutation.isPending ||
    updateRelationshipMutation.isPending ||
    deleteRelationshipMutation.isPending ||
    testPostgresConnectionMutation.isPending ||
    listPostgresSchemasMutation.isPending ||
    importPostgresMutation.isPending ||
    importSqlRawMutation.isPending ||
    importSqlFileMutation.isPending ||
    exportSqlMutation.isPending ||
    exportDictionaryMutation.isPending ||
    createSnapshotMutation.isPending ||
    updateProjectVisibilityMutation.isPending;

  const importConnectionKey = [
    importHost.trim(),
    String(importPort),
    importDatabase.trim(),
    importUser.trim(),
    importPassword,
    importSslMode.trim(),
  ].join("|");
  const isCurrentImportConnection =
    testedImportConnectionKey === importConnectionKey;
  const visibleConnectionCheckStatus = isCurrentImportConnection
    ? connectionCheckStatus
    : "idle";
  const visibleConnectionCheckMessage = isCurrentImportConnection
    ? connectionCheckMessage
    : "";
  const visibleImportSchemas = isCurrentImportConnection
    ? availableImportSchemas
    : [];
  const visibleSelectedImportSchemas = isCurrentImportConnection
    ? selectedImportSchemas
    : [];
  const visibleImportAllSchemas = isCurrentImportConnection
    ? importAllSchemas
    : true;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setStoredProjectContext({ projectId });

    if (initialShareSlug) {
      setStoredProjectContext({ shareSlug: initialShareSlug });
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
      setStoredProjectContext({ workspaceId: project.workspace_id });
      if (project.share_slug) {
        setShareSlug(project.share_slug);
        setStoredProjectContext({ shareSlug: project.share_slug });
      } else {
        setShareSlug("");
        setStoredProjectContext({ shareSlug: null });
      }
    }
  }, [projectQuery.data]);

  useEffect(() => {
    if (!projectQuery.data) {
      return;
    }
    setShareAccessOption(
      toShareAccessOption(projectQuery.data.visibility as "public" | "private"),
    );
  }, [projectQuery.data]);

  const createDiagram = createDiagramMutation.mutateAsync;

  useEffect(() => {
    if (
      !workspaceId ||
      !listDiagramsQuery.data ||
      diagramId ||
      listDiagramsQuery.isFetching
    ) {
      return;
    }

    const projectDiagram = listDiagramsQuery.data.find(
      (diagram) => diagram.project_id === projectId,
    );

    if (projectDiagram) {
      setDiagramId(projectDiagram.diagram_id);
      if (typeof window !== "undefined") {
        setStoredProjectContext({ diagramId: projectDiagram.diagram_id });
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
          setStoredProjectContext({ diagramId: diagram.diagram_id });
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
    listDiagramsQuery.isFetching,
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
      let changed = false;
      const next = { ...current };
      for (const table of tables) {
        if (next[table.table_id] === undefined) {
          next[table.table_id] = table.table_id === tables[0].table_id;
          changed = true;
        }
      }
      return changed ? next : current;
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
    if (!indexEditorDraft) {
      return;
    }

    const table = tables.find(
      (item) => item.table_id === indexEditorDraft.tableId,
    );
    if (!table) {
      setIndexEditorDraft(null);
      return;
    }

    const validColumnIds = indexEditorDraft.selectedColumnIds.filter(
      (columnId) =>
        table.columns.some((column) => column.column_id === columnId),
    );

    if (validColumnIds.length !== indexEditorDraft.selectedColumnIds.length) {
      setIndexEditorDraft((current) =>
        current
          ? {
              ...current,
              selectedColumnIds: validColumnIds,
            }
          : current,
      );
    }
  }, [indexEditorDraft, tables]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const raw = window.localStorage.getItem("ERD_DICTIONARY_HEADER_WIDTHS");
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<
        Record<DictionaryHeaderKey, number>
      >;
      setDictionaryHeaderWidths((current) => {
        const next = { ...current };
        for (const key of Object.keys(
          dictionaryHeaderDefaults,
        ) as DictionaryHeaderKey[]) {
          const value = parsed[key];
          if (typeof value === "number" && Number.isFinite(value)) {
            next[key] = Math.max(
              dictionaryHeaderMins[key],
              Math.min(MAX_DICTIONARY_COLUMN_WIDTH, Math.round(value)),
            );
          }
        }
        return next;
      });
    } catch {
      // Ignore invalid localStorage payload.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      "ERD_DICTIONARY_HEADER_WIDTHS",
      JSON.stringify(dictionaryHeaderWidths),
    );
  }, [dictionaryHeaderWidths]);

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
    setTableDialogOriginalColumns([]);
    setTableDialogFields([
      {
        localId: makeDialogFieldId(),
        columnId: null,
        columnName: "id",
        dataType: "uuid",
        isNullable: false,
        isPrimaryKey: true,
        isUnique: true,
      },
    ]);
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
    const orderedColumns = [...table.columns].sort(
      (left, right) => left.ordinal_position - right.ordinal_position,
    );
    setTableDialogOriginalColumns(orderedColumns);
    setTableDialogFields(orderedColumns.map(mapColumnToDialogField));
  }

  function beginSidebarTableRename(table: TableResponse) {
    setSelectedTableId(table.table_id);
    setEditingSidebarTableId(table.table_id);
    setEditingSidebarTableName(table.display_name ?? table.table_name);
  }

  function cancelSidebarTableRename() {
    setEditingSidebarTableId(null);
    setEditingSidebarTableName("");
  }

  async function commitSidebarTableRename(table: TableResponse) {
    if (!diagramId) {
      cancelSidebarTableRename();
      return;
    }

    const nextDisplayName = editingSidebarTableName.trim();
    if (!nextDisplayName) {
      cancelSidebarTableRename();
      return;
    }

    const currentDisplayName = table.display_name ?? table.table_name;
    if (nextDisplayName === currentDisplayName) {
      cancelSidebarTableRename();
      return;
    }

    try {
      await updateTableMutation.mutateAsync({
        diagramId,
        tableId: table.table_id,
        payload: {
          display_name: nextDisplayName,
        },
      });
      setStatusMessage("Table name updated.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to rename table.";
      setStatusMessage(message);
    }
    cancelSidebarTableRename();
  }

  const renameTableInline = useCallback(
    async (tableId: string, nextDisplayName: string) => {
      if (!diagramId) {
        return;
      }

      const table = tables.find((item) => item.table_id === tableId);
      if (!table) {
        return;
      }

      const nextValue = nextDisplayName.trim();
      if (!nextValue) {
        return;
      }

      const currentValue = table.display_name ?? table.table_name;
      if (nextValue === currentValue) {
        return;
      }

      try {
        await updateTableMutation.mutateAsync({
          diagramId,
          tableId,
          payload: {
            display_name: nextValue,
          },
        });
        setStatusMessage("Table name updated.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to rename table.";
        setStatusMessage(message);
      }
    },
    [diagramId, tables, updateTableMutation],
  );

  const renameColumnInline = useCallback(
    async (tableId: string, columnId: string, nextColumnName: string) => {
      if (!diagramId) {
        return;
      }

      const table = tables.find((item) => item.table_id === tableId);
      const column = table?.columns.find((item) => item.column_id === columnId);
      if (!table || !column) {
        return;
      }

      const nextValue = nextColumnName.trim();
      if (!nextValue || nextValue === column.column_name) {
        return;
      }

      try {
        await updateColumnMutation.mutateAsync({
          diagramId,
          tableId,
          columnId,
          payload: {
            column_name: nextValue,
          },
        });
        setStatusMessage("Column name updated.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update column.";
        setStatusMessage(message);
      }
    },
    [diagramId, tables, updateColumnMutation],
  );

  const changeColumnTypeInline = useCallback(
    async (tableId: string, columnId: string, nextTypeName: string) => {
      if (!diagramId) {
        return;
      }

      const table = tables.find((item) => item.table_id === tableId);
      const column = table?.columns.find((item) => item.column_id === columnId);
      if (!table || !column) {
        return;
      }

      const nextValue = nextTypeName.trim() || "text";
      const currentTypeName = getColumnTypeName(column);
      if (nextValue === currentTypeName) {
        return;
      }

      try {
        await updateColumnMutation.mutateAsync({
          diagramId,
          tableId,
          columnId,
          payload: buildColumnTypePayload(nextValue, customTypeNameSet),
        });
        setStatusMessage("Column type updated.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to update column.";
        setStatusMessage(message);
      }
    },
    [customTypeNameSet, diagramId, tables, updateColumnMutation],
  );

  function closeTableDialog() {
    setTableDialog((current) => ({ ...current, open: false }));
    setTableDialogOriginalColumns([]);
    setTableDialogFields([]);
  }

  function closeCustomTypeEditor() {
    setCustomTypeEditor({
      open: false,
      mode: "create",
      customTypeId: null,
      schemaName: "public",
      typeName: "",
      enumValuesText: "",
    });
  }

  function openCreateCustomTypeEditor() {
    setCustomTypeEditor({
      open: true,
      mode: "create",
      customTypeId: null,
      schemaName: "public",
      typeName: "",
      enumValuesText: "",
    });
  }

  function openEditCustomTypeEditor(customType: CustomTypeResponse) {
    setCustomTypeEditor({
      open: true,
      mode: "edit",
      customTypeId: customType.custom_type_id,
      schemaName: customType.schema_name,
      typeName: customType.type_name,
      enumValuesText: customType.enum_values.join("\n"),
    });
  }

  async function saveCustomType() {
    if (!diagramId) {
      return;
    }

    const typeName = customTypeEditor.typeName.trim();
    const enumValues = parseCustomTypeValuesInput(
      customTypeEditor.enumValuesText,
    );
    if (!typeName) {
      setStatusMessage("Enum name is required.");
      return;
    }
    if (enumValues.length === 0) {
      setStatusMessage("Add at least one enum value.");
      return;
    }

    try {
      if (customTypeEditor.mode === "create") {
        const created = await createCustomTypeMutation.mutateAsync({
          diagramId,
          payload: {
            schema_name: customTypeEditor.schemaName.trim() || "public",
            type_name: typeName,
            enum_values: enumValues,
          },
        });
        setStatusMessage(`Enum created: ${created.type_name}`);
      } else if (customTypeEditor.customTypeId) {
        const updated = await updateCustomTypeMutation.mutateAsync({
          diagramId,
          customTypeId: customTypeEditor.customTypeId,
          payload: {
            schema_name: customTypeEditor.schemaName.trim() || "public",
            type_name: typeName,
            enum_values: enumValues,
          },
        });
        setStatusMessage(`Enum updated: ${updated.type_name}`);
      }

      closeCustomTypeEditor();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save enum.";
      setStatusMessage(message);
    }
  }

  async function deleteCustomType(customType: CustomTypeResponse) {
    if (!diagramId) {
      return;
    }

    try {
      await deleteCustomTypeMutation.mutateAsync({
        diagramId,
        customTypeId: customType.custom_type_id,
      });
      if (customTypeEditor.customTypeId === customType.custom_type_id) {
        closeCustomTypeEditor();
      }
      setStatusMessage(`Enum deleted: ${customType.type_name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete enum.";
      setStatusMessage(message);
    }
  }

  function updateTableDialogField(
    localId: string,
    patch: Partial<TableDialogFieldDraft>,
  ) {
    setTableDialogFields((current) =>
      current.map((field) =>
        field.localId === localId ? { ...field, ...patch } : field,
      ),
    );
  }

  function addTableDialogField() {
    setTableDialogFields((current) => [
      ...current,
      {
        localId: makeDialogFieldId(),
        columnId: null,
        columnName: "",
        dataType: "text",
        isNullable: true,
        isPrimaryKey: false,
        isUnique: false,
      },
    ]);
  }

  function removeTableDialogField(localId: string) {
    setTableDialogFields((current) =>
      current.filter((field) => field.localId !== localId),
    );
  }

  function moveTableDialogField(localId: string, direction: "up" | "down") {
    setTableDialogFields((current) => {
      const currentIndex = current.findIndex(
        (field) => field.localId === localId,
      );
      if (currentIndex < 0) {
        return current;
      }

      const nextIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(currentIndex, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  }

  function normalizeTableDialogFields(): NormalizedTableDialogField[] | null {
    const normalizedFields: NormalizedTableDialogField[] =
      tableDialogFields.map((field, index) => ({
        ...field,
        columnName: field.columnName.trim(),
        dataType: field.dataType.trim() || "text",
        ordinalPosition: index + 1,
      }));

    const emptyField = normalizedFields.find((field) => !field.columnName);
    if (emptyField) {
      setStatusMessage("Each field needs a column name.");
      return null;
    }

    const loweredNames = normalizedFields.map((field) =>
      field.columnName.toLowerCase(),
    );
    if (new Set(loweredNames).size !== loweredNames.length) {
      setStatusMessage("Field names must be unique inside the table.");
      return null;
    }

    return normalizedFields;
  }

  async function syncTableDialogFields(
    tableId: string,
    fields: NormalizedTableDialogField[],
    originalColumns: ColumnResponse[],
  ) {
    if (!diagramId) {
      return;
    }

    const existingColumnsById = new Map(
      originalColumns.map((column) => [column.column_id, column]),
    );
    const retainedExistingColumnIds = new Set(
      fields.flatMap((field) =>
        field.columnId && existingColumnsById.has(field.columnId)
          ? [field.columnId]
          : [],
      ),
    );

    let tempOrdinal = fields.length + originalColumns.length + 100;
    for (const field of fields) {
      if (!field.columnId || !existingColumnsById.has(field.columnId)) {
        continue;
      }

      await updateColumnMutation.mutateAsync({
        diagramId,
        tableId,
        columnId: field.columnId,
        payload: {
          ordinal_position: tempOrdinal,
        },
      });
      tempOrdinal += 1;
    }

    for (const column of originalColumns) {
      if (retainedExistingColumnIds.has(column.column_id)) {
        continue;
      }
      await deleteColumnMutation.mutateAsync({
        diagramId,
        tableId,
        columnId: column.column_id,
      });
    }

    for (const field of fields) {
      if (field.columnId && existingColumnsById.has(field.columnId)) {
        continue;
      }

      await createColumnMutation.mutateAsync({
        diagramId,
        tableId,
        payload: {
          column_name: field.columnName,
          ordinal_position: field.ordinalPosition,
          ...buildColumnTypePayload(field.dataType, customTypeNameSet),
          is_nullable: field.isNullable,
          is_primary_key: field.isPrimaryKey,
          is_unique: field.isUnique,
          default_sql: "",
          example_value: "",
          ui_width: DEFAULT_DICTIONARY_COLUMN_WIDTH,
          comment_text: "",
        },
      });
    }

    for (const field of fields) {
      if (!field.columnId || !existingColumnsById.has(field.columnId)) {
        continue;
      }

      const existingColumn = existingColumnsById.get(field.columnId);
      if (!existingColumn) {
        continue;
      }

      const patch: Parameters<
        typeof updateColumnMutation.mutateAsync
      >[0]["payload"] = {};

      patch.ordinal_position = field.ordinalPosition;

      if (existingColumn.column_name !== field.columnName) {
        patch.column_name = field.columnName;
      }
      if (getColumnTypeName(existingColumn) !== field.dataType) {
        Object.assign(
          patch,
          buildColumnTypePayload(field.dataType, customTypeNameSet),
        );
      }
      if (existingColumn.is_nullable !== field.isNullable) {
        patch.is_nullable = field.isNullable;
      }
      if (existingColumn.is_primary_key !== field.isPrimaryKey) {
        patch.is_primary_key = field.isPrimaryKey;
      }
      if (existingColumn.is_unique !== field.isUnique) {
        patch.is_unique = field.isUnique;
      }

      await updateColumnMutation.mutateAsync({
        diagramId,
        tableId,
        columnId: field.columnId,
        payload: patch,
      });
    }
  }

  async function saveTableDialog() {
    if (!diagramId) {
      return;
    }

    const normalizedFields = normalizeTableDialogFields();
    if (!normalizedFields) {
      return;
    }

    try {
      if (tableDialog.mode === "create") {
        const tableName = normalizeTableName(
          tableDialog.tableName,
          "table_new",
        );
        const displayName = tableDialog.displayName.trim() || tableName;

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

        await syncTableDialogFields(
          createdTable.table_id,
          normalizedFields,
          [],
        );
        setSelectedTableId(createdTable.table_id);
        setStatusMessage(
          `Table created: ${createdTable.table_name} (${normalizedFields.length} field${normalizedFields.length === 1 ? "" : "s"}).`,
        );
      } else if (tableDialog.tableId) {
        await updateTableMutation.mutateAsync({
          diagramId,
          tableId: tableDialog.tableId,
          payload: {
            display_name:
              tableDialog.displayName.trim() || tableDialog.tableName,
            color_hex: tableDialog.colorHex,
          },
        });

        await syncTableDialogFields(
          tableDialog.tableId,
          normalizedFields,
          tableDialogOriginalColumns,
        );
        setStatusMessage("Table updated with fields.");
      }

      closeTableDialog();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save table.";
      setStatusMessage(message);
    }
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
            example_value: column.example_value ?? "",
            ui_width:
              typeof column.ui_width === "number" && column.ui_width > 0
                ? column.ui_width
                : DEFAULT_DICTIONARY_COLUMN_WIDTH,
            comment_text: column.comment_text ?? "",
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
          ...buildColumnTypePayload(draft.dataType, customTypeNameSet),
          is_nullable: draft.isNullable,
          is_primary_key: false,
          is_unique: false,
          default_sql: "",
          example_value: "",
          ui_width: DEFAULT_DICTIONARY_COLUMN_WIDTH,
          comment_text: "",
        },
      });

      setSelectedTableId(tableId);
      setSelectedColumnId(createdColumn.column_id);
      setNewColumnDraft(tableId, {
        name: "",
        dataType: draft.dataType,
        isNullable: draft.isNullable,
      });
      setOpenNewFieldTableId(null);
      setActiveFieldRow(null);
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
    options?: { successMessage?: string | null },
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
      const successMessage = options?.successMessage ?? "Column updated.";
      if (successMessage) {
        setStatusMessage(successMessage);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update column.";
      setStatusMessage(message);
    }
  }

  async function deleteColumnFromTable(tableId: string, columnId: string) {
    if (!diagramId) {
      return;
    }

    try {
      await deleteColumnMutation.mutateAsync({
        diagramId,
        tableId,
        columnId,
      });
      setStatusMessage("Column deleted.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete column.";
      setStatusMessage(message);
    }
  }

  function openCreateIndexEditor(table: TableResponse) {
    const firstPrimaryKeyColumnId =
      table.columns.find((column) => column.is_primary_key)?.column_id ?? "";
    const firstColumnId = table.columns[0]?.column_id ?? "";
    const initialColumnId = firstPrimaryKeyColumnId || firstColumnId;

    setIndexEditorDraft({
      tableId: table.table_id,
      mode: "create",
      indexId: null,
      indexName: `${table.table_name}_idx`,
      method: "btree",
      isUnique: false,
      commentText: "",
      selectedColumnIds: initialColumnId ? [initialColumnId] : [],
      columnSearch: "",
    });
  }

  function openEditIndexEditor(
    table: TableResponse,
    index: IndexMutationResponse,
  ) {
    if (index.source !== "user") {
      setStatusMessage("System indexes are read-only.");
      return;
    }

    setIndexEditorDraft({
      tableId: table.table_id,
      mode: "edit",
      indexId: index.index_id,
      indexName: index.index_name,
      method: index.method,
      isUnique: index.is_unique,
      commentText: index.comment_text ?? "",
      selectedColumnIds: [...index.column_ids],
      columnSearch: "",
    });
  }

  function closeIndexEditor(tableId?: string) {
    setIndexEditorDraft((current) => {
      if (!current) {
        return current;
      }
      if (tableId && current.tableId !== tableId) {
        return current;
      }
      return null;
    });
  }

  function patchIndexEditorDraft(patch: Partial<IndexEditorDraft>) {
    setIndexEditorDraft((current) => {
      if (!current) {
        return current;
      }
      return { ...current, ...patch };
    });
  }

  function toggleIndexColumnSelection(columnId: string) {
    setIndexEditorDraft((current) => {
      if (!current) {
        return current;
      }

      const exists = current.selectedColumnIds.includes(columnId);
      if (exists) {
        return {
          ...current,
          selectedColumnIds: current.selectedColumnIds.filter(
            (id) => id !== columnId,
          ),
        };
      }

      return {
        ...current,
        selectedColumnIds: [...current.selectedColumnIds, columnId],
      };
    });
  }

  function moveSelectedIndexColumn(columnId: string, direction: "up" | "down") {
    setIndexEditorDraft((current) => {
      if (!current) {
        return current;
      }
      const index = current.selectedColumnIds.indexOf(columnId);
      if (index < 0) {
        return current;
      }
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.selectedColumnIds.length) {
        return current;
      }
      const nextColumnIds = [...current.selectedColumnIds];
      const [moved] = nextColumnIds.splice(index, 1);
      nextColumnIds.splice(targetIndex, 0, moved);
      return {
        ...current,
        selectedColumnIds: nextColumnIds,
      };
    });
  }

  async function saveIndexEditorDraft() {
    if (!diagramId || !indexEditorDraft) {
      return;
    }

    const table = tables.find(
      (item) => item.table_id === indexEditorDraft.tableId,
    );
    if (!table) {
      return;
    }

    const indexName = indexEditorDraft.indexName.trim();
    if (!indexName) {
      setStatusMessage("Index name is required.");
      return;
    }

    const selectedColumnIds = indexEditorDraft.selectedColumnIds.filter(
      (columnId) =>
        table.columns.some((column) => column.column_id === columnId),
    );
    if (selectedColumnIds.length === 0) {
      setStatusMessage("Select at least one column for the index.");
      return;
    }

    try {
      if (indexEditorDraft.mode === "create") {
        const created = await createIndexMutation.mutateAsync({
          diagramId,
          tableId: table.table_id,
          payload: {
            index_name: indexName,
            method: indexEditorDraft.method,
            is_unique: indexEditorDraft.isUnique,
            comment_text: indexEditorDraft.commentText.trim() || null,
            column_ids: selectedColumnIds,
          },
        });
        setStatusMessage(`Index created: ${created.index_name}`);
      } else if (indexEditorDraft.indexId) {
        const updated = await updateIndexMutation.mutateAsync({
          diagramId,
          tableId: table.table_id,
          indexId: indexEditorDraft.indexId,
          payload: {
            index_name: indexName,
            method: indexEditorDraft.method,
            is_unique: indexEditorDraft.isUnique,
            comment_text: indexEditorDraft.commentText.trim() || null,
            column_ids: selectedColumnIds,
          },
        });
        setStatusMessage(`Index updated: ${updated.index_name}`);
      }

      setIndexEditorDraft(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save index.";
      setStatusMessage(message);
    }
  }

  async function deleteIndexFromTable(
    table: TableResponse,
    index: IndexMutationResponse,
  ) {
    if (!diagramId) {
      return;
    }
    if (index.source !== "user") {
      setStatusMessage("System indexes are read-only.");
      return;
    }

    try {
      await deleteIndexMutation.mutateAsync({
        diagramId,
        tableId: table.table_id,
        indexId: index.index_id,
      });
      if (indexEditorDraft?.indexId === index.index_id) {
        setIndexEditorDraft(null);
      }
      setStatusMessage(`Index deleted: ${index.index_name}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete index.";
      setStatusMessage(message);
    }
  }

  function openFieldAttributes(table: TableResponse, column: ColumnResponse) {
    const baseType = removeArraySuffix(getColumnTypeName(column));

    setFieldAttributesDraft({
      tableId: table.table_id,
      columnId: column.column_id,
      primaryKey: column.is_primary_key,
      unique: column.is_unique,
      autoIncrement: inferAutoIncrement(column.default_sql),
      array: getColumnTypeName(column).endsWith("[]"),
      isNullable: column.is_nullable,
      defaultValue: column.default_sql ?? "",
      example: column.example_value ?? "",
      comments: columnComments[column.column_id] ?? column.comment_text ?? "",
      baseType,
    });
  }

  async function saveFieldAttributes() {
    if (!fieldAttributesDraft) {
      return;
    }

    const dataTypeName = fieldAttributesDraft.array
      ? `${removeArraySuffix(fieldAttributesDraft.baseType)}[]`
      : removeArraySuffix(fieldAttributesDraft.baseType);
    const currentColumn = findColumn(
      tables,
      fieldAttributesDraft.tableId,
      fieldAttributesDraft.columnId,
    );
    const currentTypeName = currentColumn
      ? getColumnTypeName(currentColumn)
      : null;

    if (fieldAttributesDraft.autoIncrement) {
      if (fieldAttributesDraft.array) {
        setStatusMessage("Auto-increment is not allowed on array columns.");
        return;
      }
      if (!isIdentityCompatibleType(dataTypeName)) {
        setStatusMessage(
          "Auto-increment is only allowed for int or bigint columns.",
        );
        return;
      }
    }

    const nextDefault = fieldAttributesDraft.autoIncrement
      ? "generated by default as identity"
      : fieldAttributesDraft.defaultValue.trim() || null;
    const nextExample = fieldAttributesDraft.example;
    const nextIsPrimaryKey = fieldAttributesDraft.primaryKey;
    const nextIsUnique = nextIsPrimaryKey ? true : fieldAttributesDraft.unique;
    const nextIsNullable = nextIsPrimaryKey
      ? false
      : fieldAttributesDraft.autoIncrement
        ? false
        : fieldAttributesDraft.isNullable;
    const patch: Parameters<
      typeof updateColumnMutation.mutateAsync
    >[0]["payload"] = {
      is_primary_key: nextIsPrimaryKey,
      is_unique: nextIsUnique,
      is_nullable: nextIsNullable,
      default_sql: nextDefault,
      example_value: nextExample,
      comment_text: fieldAttributesDraft.comments.trim(),
    };

    if (currentTypeName !== dataTypeName) {
      Object.assign(
        patch,
        buildColumnTypePayload(dataTypeName, customTypeNameSet),
      );
    }

    await updateColumn(
      fieldAttributesDraft.tableId,
      fieldAttributesDraft.columnId,
      patch,
      {
        successMessage: "Field attributes updated.",
      },
    );

    setColumnDefaultDrafts((current) => ({
      ...current,
      [fieldAttributesDraft.columnId]: nextDefault ?? "",
    }));
    setColumnExampleDrafts((current) => ({
      ...current,
      [fieldAttributesDraft.columnId]: nextExample,
    }));
    setColumnComments((current) => ({
      ...current,
      [fieldAttributesDraft.columnId]: fieldAttributesDraft.comments,
    }));

    setFieldAttributesDraft(null);
  }

  function getOrderedColumns(table: TableResponse) {
    return [...table.columns].sort(
      (left, right) => left.ordinal_position - right.ordinal_position,
    );
  }

  function getDictionaryInputClass(isActive: boolean) {
    return `w-full rounded-md px-2 py-1 text-xs outline-none transition-colors ${
      isActive
        ? "border border-slate-300 bg-white focus:border-blue-500"
        : "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus:border-slate-300 focus:bg-white"
    }`;
  }

  function clampDictionaryColumnWidth(key: DictionaryHeaderKey, value: number) {
    return Math.max(
      dictionaryHeaderMins[key],
      Math.min(MAX_DICTIONARY_COLUMN_WIDTH, Math.round(value)),
    );
  }

  function getDictionaryHeaderWidth(key: DictionaryHeaderKey) {
    const width = dictionaryHeaderWidths[key];
    if (typeof width !== "number" || !Number.isFinite(width)) {
      return dictionaryHeaderDefaults[key];
    }
    return clampDictionaryColumnWidth(key, width);
  }

  function startColumnWidthResize(
    event: ReactMouseEvent<HTMLButtonElement>,
    key: DictionaryHeaderKey,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const startWidth = getDictionaryHeaderWidth(key);
    columnResizeRef.current = {
      key,
      startX: event.clientX,
      startWidth,
      latestWidth: startWidth,
    };
    setIsColumnResizing(true);

    const onPointerMove = (moveEvent: MouseEvent) => {
      const active = columnResizeRef.current;
      if (!active || active.key !== key) {
        return;
      }
      const nextWidth = clampDictionaryColumnWidth(
        key,
        active.startWidth + moveEvent.clientX - active.startX,
      );
      active.latestWidth = nextWidth;
      setDictionaryHeaderWidths((current) =>
        current[key] === nextWidth
          ? current
          : {
              ...current,
              [key]: nextWidth,
            },
      );
    };

    const onPointerUp = () => {
      columnResizeRef.current = null;
      setIsColumnResizing(false);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("mouseup", onPointerUp);
    };

    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);
  }

  async function commitColumnNameDraft(
    tableId: string,
    column: ColumnResponse,
  ) {
    const draftValue = columnNameDrafts[column.column_id];
    if (draftValue === undefined) {
      return;
    }

    const nextValue = draftValue.trim();
    if (!nextValue) {
      setColumnNameDrafts((current) => ({
        ...current,
        [column.column_id]: column.column_name,
      }));
      return;
    }

    if (nextValue === column.column_name) {
      return;
    }

    await updateColumn(tableId, column.column_id, {
      column_name: nextValue,
    });
  }

  async function commitColumnDefaultDraft(
    tableId: string,
    column: ColumnResponse,
  ) {
    const draftValue = columnDefaultDrafts[column.column_id];
    if (draftValue === undefined) {
      return;
    }

    const currentValue = column.default_sql ?? "";
    if (draftValue === currentValue) {
      return;
    }

    await updateColumn(tableId, column.column_id, {
      // The API uses COALESCE for patches; empty string is used to clear.
      default_sql: draftValue === "" ? "" : draftValue,
    });
  }

  async function commitColumnExampleDraft(
    tableId: string,
    column: ColumnResponse,
  ) {
    const draftValue = columnExampleDrafts[column.column_id];
    if (draftValue === undefined) {
      return;
    }

    const currentValue = column.example_value ?? "";
    if (draftValue === currentValue) {
      return;
    }

    await updateColumn(tableId, column.column_id, {
      // The API uses COALESCE for patches; empty string is used to clear.
      example_value: draftValue === "" ? "" : draftValue,
    });
  }

  async function commitColumnCommentDraft(
    tableId: string,
    column: ColumnResponse,
  ) {
    const draftValue = columnComments[column.column_id];
    if (draftValue === undefined) {
      return;
    }

    const currentValue = column.comment_text ?? "";
    if (draftValue === currentValue) {
      return;
    }

    await updateColumn(tableId, column.column_id, {
      // The API uses COALESCE for patches; empty string is used to clear.
      comment_text: draftValue === "" ? "" : draftValue,
    });
  }

  async function commitTableCommentDraft(table: TableResponse) {
    if (!diagramId) {
      return;
    }

    const draftValue = tableComments[table.table_id];
    if (draftValue === undefined) {
      return;
    }

    const currentValue = table.comment_text ?? "";
    if (draftValue === currentValue) {
      return;
    }

    try {
      await updateTableMutation.mutateAsync({
        diagramId,
        tableId: table.table_id,
        payload: {
          comment_text: draftValue === "" ? "" : draftValue,
        },
      });
      setStatusMessage("Table description updated.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update table description.";
      setStatusMessage(message);
    }
  }

  async function reorderTableColumns(
    tableId: string,
    nextOrderedColumnIds: string[],
  ) {
    if (!diagramId) {
      return;
    }

    const table = tables.find((item) => item.table_id === tableId);
    if (!table) {
      return;
    }

    const currentOrderedColumns = getOrderedColumns(table);
    const currentOrderKey = currentOrderedColumns
      .map((column) => column.column_id)
      .join("|");
    const nextOrderedColumns = nextOrderedColumnIds
      .map((columnId) =>
        currentOrderedColumns.find((column) => column.column_id === columnId),
      )
      .filter((column): column is ColumnResponse => Boolean(column));
    const nextOrderKey = nextOrderedColumns
      .map((column) => column.column_id)
      .join("|");

    if (
      currentOrderedColumns.length !== nextOrderedColumns.length ||
      currentOrderKey === nextOrderKey
    ) {
      return;
    }

    try {
      let temporaryOrdinal = nextOrderedColumns.length + 1000;
      for (const column of nextOrderedColumns) {
        await updateColumnMutation.mutateAsync({
          diagramId,
          tableId,
          columnId: column.column_id,
          payload: {
            ordinal_position: temporaryOrdinal,
          },
        });
        temporaryOrdinal += 1;
      }

      for (const [index, column] of nextOrderedColumns.entries()) {
        await updateColumnMutation.mutateAsync({
          diagramId,
          tableId,
          columnId: column.column_id,
          payload: {
            ordinal_position: index + 1,
          },
        });
      }

      setStatusMessage("Fields reordered.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reorder fields.";
      setStatusMessage(message);
    }
  }

  async function moveColumnByStep(
    tableId: string,
    columnId: string,
    direction: "up" | "down",
  ) {
    const table = tables.find((item) => item.table_id === tableId);
    if (!table) {
      return;
    }

    const orderedColumns = getOrderedColumns(table);
    const sourceIndex = orderedColumns.findIndex(
      (column) => column.column_id === columnId,
    );
    if (sourceIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? sourceIndex - 1 : sourceIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedColumns.length) {
      return;
    }

    const nextOrderedColumns = [...orderedColumns];
    const [movedColumn] = nextOrderedColumns.splice(sourceIndex, 1);
    nextOrderedColumns.splice(targetIndex, 0, movedColumn);

    await reorderTableColumns(
      tableId,
      nextOrderedColumns.map((column) => column.column_id),
    );
  }

  async function dropColumnOnTarget(tableId: string, targetColumnId: string) {
    if (!draggedColumn || draggedColumn.tableId !== tableId) {
      return;
    }

    if (draggedColumn.columnId === targetColumnId) {
      return;
    }

    const table = tables.find((item) => item.table_id === tableId);
    if (!table) {
      return;
    }

    const orderedColumns = getOrderedColumns(table);
    const sourceIndex = orderedColumns.findIndex(
      (column) => column.column_id === draggedColumn.columnId,
    );
    const targetIndex = orderedColumns.findIndex(
      (column) => column.column_id === targetColumnId,
    );
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextOrderedColumns = [...orderedColumns];
    const [movedColumn] = nextOrderedColumns.splice(sourceIndex, 1);
    nextOrderedColumns.splice(targetIndex, 0, movedColumn);

    await reorderTableColumns(
      tableId,
      nextOrderedColumns.map((column) => column.column_id),
    );
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

    const sourceTypeLabel = getColumnTypeName(sourceColumn);
    const targetTypeLabel = getColumnTypeName(targetColumn);
    const sourceType = normalizeTypeForComparison(sourceTypeLabel);
    const targetType = normalizeTypeForComparison(targetTypeLabel);

    if (sourceType !== targetType) {
      setStatusMessage(
        `Type mismatch: ${sourceColumn.column_name} (${sourceTypeLabel}) cannot connect to ${targetColumn.column_name} (${targetTypeLabel}).`,
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

  function updateProjectView(nextView: ProjectView) {
    if (nextView === initialView) {
      return;
    }

    const basePath =
      nextView === "erd"
        ? `/project/${projectId}`
        : `/project/${projectId}/dictionary`;
    const queryString = initialShareSlug
      ? `?share=${encodeURIComponent(initialShareSlug)}`
      : "";
    const targetPath = `${basePath}${queryString}`;

    router.push(targetPath);
  }

  function openShareDialog() {
    if (!projectQuery.data) {
      return;
    }
    setShareAccessOption(
      toShareAccessOption(projectQuery.data.visibility as "public" | "private"),
    );
    setIsShareDialogOpen(true);
  }

  async function setProjectAccess(nextAccess: ShareAccessOption) {
    if (!projectQuery.data) {
      return;
    }

    if (!isAuthenticated && nextAccess !== "anyoneWithLink") {
      setStatusMessage("Log in to change this sharing option.");
      router.push("/auth/login");
      return;
    }

    const visibilityPayload = toVisibilityPayload(nextAccess);
    if (!visibilityPayload) {
      setStatusMessage(
        "Only selected people is not supported by the current backend access model.",
      );
      return;
    }

    try {
      const updated = await updateProjectVisibilityMutation.mutateAsync({
        projectId: projectQuery.data.project_id,
        payload: visibilityPayload,
      });
      setShareAccessOption(
        toShareAccessOption(updated.visibility as "public" | "private"),
      );
      setStatusMessage(`Project visibility: ${updated.visibility}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update project visibility.";
      setStatusMessage(message);
    }
  }

  function beginProjectNameEdit() {
    if (!projectQuery.data) {
      return;
    }
    setEditingProjectName(projectQuery.data.name);
    setIsEditingProjectName(true);
  }

  function cancelProjectNameEdit() {
    if (projectQuery.data) {
      setEditingProjectName(projectQuery.data.name);
    }
    setIsEditingProjectName(false);
  }

  async function commitProjectNameEdit() {
    if (!projectQuery.data || !isEditingProjectName) {
      return;
    }

    const nextName = editingProjectName.trim();
    setIsEditingProjectName(false);

    if (!nextName) {
      setEditingProjectName(projectQuery.data.name);
      setStatusMessage("Project name cannot be empty.");
      return;
    }

    if (nextName === projectQuery.data.name) {
      setEditingProjectName(projectQuery.data.name);
      return;
    }

    try {
      const updated = await updateProjectMutation.mutateAsync({
        projectId: projectQuery.data.project_id,
        payload: { name: nextName },
      });
      setEditingProjectName(updated.name);
      setStatusMessage("Project name updated.");
    } catch (error) {
      setEditingProjectName(projectQuery.data.name);
      setStatusMessage(getApiErrorMessage(error, "Unable to update project."));
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

  function redirectToLoginForSharing() {
    router.push("/auth/login");
  }

  function resetLocalSession() {
    if (typeof window === "undefined") {
      return;
    }

    clearStoredProjectContext();
    window.location.href = "/";
  }

  function openImportDialog() {
    setImportDialogTab("database");
    setImportSqlFile(null);
    setImportSqlText("");
    setIsImportDialogOpen(true);
  }

  function buildConnectionPayload(): PostgresConnectionRequest {
    return {
      host: importHost.trim(),
      port: importPort,
      database_name: importDatabase.trim(),
      username: importUser.trim(),
      password: importPassword,
      ssl_mode: importSslMode.trim() || "prefer",
    };
  }

  async function loadSchemasFromConnection() {
    if (!diagramId) {
      return;
    }
    const result = await listPostgresSchemasMutation.mutateAsync({
      diagramId,
      payload: buildConnectionPayload(),
    });
    setAvailableImportSchemas(result.schemas);
    setImportAllSchemas(true);
    setSelectedImportSchemas(result.schemas);
    setTestedImportConnectionKey(importConnectionKey);
    if (result.schemas.length === 0) {
      setStatusMessage(
        "Connection succeeded, but no importable schemas found.",
      );
      return;
    }
    setStatusMessage(`Schemas loaded: ${result.schemas.length}`);
  }

  async function testImportConnection() {
    if (!diagramId) {
      return;
    }
    try {
      const result = await testPostgresConnectionMutation.mutateAsync({
        diagramId,
        payload: buildConnectionPayload(),
      });
      setTestedImportConnectionKey(importConnectionKey);
      setConnectionCheckStatus("success");
      setConnectionCheckMessage(
        `Connected as ${result.current_user} on ${result.database_name}`,
      );
      setStatusMessage(
        `Connection OK (${result.current_user}@${result.database_name}).`,
      );
      await loadSchemasFromConnection();
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to connect to PostgreSQL source.",
      );
      setTestedImportConnectionKey(importConnectionKey);
      setConnectionCheckStatus("failed");
      setConnectionCheckMessage(message);
      setStatusMessage(message);
      setAvailableImportSchemas([]);
      setSelectedImportSchemas([]);
    }
  }

  function toggleImportSchemaSelection(schema: string) {
    setSelectedImportSchemas((current) => {
      if (current.includes(schema)) {
        return current.filter((item) => item !== schema);
      }
      return [...current, schema].sort((left, right) =>
        left.localeCompare(right),
      );
    });
  }

  function toggleExportSchemaSelection(schema: string) {
    setSelectedExportSchemas((current) => {
      if (current.includes(schema)) {
        return current.filter((item) => item !== schema);
      }
      return [...current, schema].sort((left, right) =>
        left.localeCompare(right),
      );
    });
  }

  async function importSchemaFromPostgres() {
    if (!diagramId) {
      return;
    }

    if (visibleConnectionCheckStatus !== "success") {
      setStatusMessage("Test connection first before importing.");
      return;
    }

    const selectedSchemas = visibleImportAllSchemas
      ? visibleImportSchemas
      : visibleSelectedImportSchemas;
    if (selectedSchemas.length === 0) {
      setStatusMessage("Select at least one schema to import.");
      return;
    }

    try {
      const result = await importPostgresMutation.mutateAsync({
        diagramId,
        payload: {
          ...buildConnectionPayload(),
          schema_names: selectedSchemas,
          schema_name: selectedSchemas[0] ?? null,
          import_all_schemas: visibleImportAllSchemas,
        },
      });

      setStatusMessage(
        `Import done: tables=${result.table_count} columns=${result.column_count} relationships=${result.relationship_count}`,
      );
      setIsImportDialogOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to import schema.");
      setStatusMessage(message);
    }
  }

  async function importSchemaFromSqlText() {
    if (!diagramId) {
      return;
    }

    const sqlText = importSqlText.trim();
    if (!sqlText) {
      setStatusMessage("Paste SQL before importing.");
      return;
    }

    try {
      const result = await importSqlRawMutation.mutateAsync({
        diagramId,
        payload: {
          sql: sqlText,
        },
      });
      setStatusMessage(
        `Import done: tables=${result.table_count} columns=${result.column_count} relationships=${result.relationship_count}`,
      );
      setIsImportDialogOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to import SQL text.");
      setStatusMessage(message);
    }
  }

  async function importSchemaFromSqlFile() {
    if (!diagramId) {
      return;
    }

    if (!importSqlFile) {
      setStatusMessage("Choose a .sql file before importing.");
      return;
    }

    try {
      const result = await importSqlFileMutation.mutateAsync({
        diagramId,
        file: importSqlFile,
      });
      setStatusMessage(
        `Import done: tables=${result.table_count} columns=${result.column_count} relationships=${result.relationship_count}`,
      );
      setIsImportDialogOpen(false);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to import SQL file.");
      setStatusMessage(message);
    }
  }

  async function exportSql() {
    if (!diagramId) {
      return;
    }

    try {
      if (!exportAllSchemas && selectedSourceExportSchemas.length === 0) {
        setStatusMessage("Select at least one source schema for export.");
        return;
      }

      const result = await exportSqlMutation.mutateAsync({
        diagramId,
        payload: {
          target_schema: exportSchema.trim() || "public",
          source_schema_names: selectedSourceExportSchemas,
          export_all_schemas: exportAllSchemas,
        },
      });
      setExportSqlOutput(result.sql_output);
      setStatusMessage(`Export done: ${result.statement_count} statements.`);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to export SQL.");
      setStatusMessage(message);
    }
  }

  async function exportDictionaryFile() {
    if (!diagramId) {
      return;
    }

    if (!exportAllSchemas && selectedSourceExportSchemas.length === 0) {
      setStatusMessage("Select at least one source schema for export.");
      return;
    }

    try {
      const exported = await exportDictionaryMutation.mutateAsync({
        diagramId,
        payload: {
          source_schema_names: selectedSourceExportSchemas,
          export_all_schemas: exportAllSchemas,
          layout: dictionaryLayout,
          file_type: dictionaryFileType,
          include_enums: true,
        },
      });

      if (typeof window === "undefined") {
        return;
      }

      const downloadUrl = window.URL.createObjectURL(exported.blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = exported.filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setStatusMessage(`Dictionary downloaded: ${exported.filename}`);
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        "Unable to export data dictionary.",
      );
      setStatusMessage(message);
    }
  }

  async function copyExportSqlOutput() {
    if (!exportSqlOutput.trim()) {
      setStatusMessage("No SQL output to copy yet.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setStatusMessage("Clipboard is not available in this browser.");
      return;
    }

    try {
      await navigator.clipboard.writeText(exportSqlOutput);
      setStatusMessage("SQL output copied.");
    } catch {
      setStatusMessage("Unable to copy SQL output.");
    }
  }

  function downloadExportSqlOutput() {
    if (!exportSqlOutput.trim()) {
      setStatusMessage("No SQL output to download yet.");
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const sanitizedSchema = (exportSchema.trim() || "public")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `erd_export_${sanitizedSchema || "public"}_${timestamp}.sql`;
    const blob = new Blob([exportSqlOutput], {
      type: "application/sql;charset=utf-8",
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(downloadUrl);
    setStatusMessage(`SQL downloaded: ${filename}`);
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

  async function handleDuplicateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!duplicateProjectName.trim() || !projectId) {
      return;
    }

    setDuplicateProjectError("");

    try {
      const newProject = await duplicateProjectMutation.mutateAsync({
        projectId: projectId,
        payload: { name: duplicateProjectName.trim() },
      });
      setIsDuplicateProjectOpen(false);
      setDuplicateProjectName("");
      setDuplicateProjectError("");
      setStatusMessage("Project duplicated successfully.");
      router.push(`/project/${newProject.project_id}`);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to duplicate project.");
      setDuplicateProjectError(message);
      setStatusMessage(message);
    }
  }

  function handleOpenDuplicate() {
    setIsActionsMenuOpen(false);
    if (projectQuery.data) {
      setDuplicateProjectName(`Copy of ${projectQuery.data.name}`);
      setDuplicateProjectError("");
      setIsDuplicateProjectOpen(true);
    }
  }

  function handleOpenNewProject() {
    setIsActionsMenuOpen(false);
    setIsCreateProjectOpen(true);
  }

  const isProjectResolutionPending =
    !activeProjectId ||
    sessionQuery.isPending ||
    isSessionRecoveryPending ||
    projectQuery.isPending ||
    (projectQuery.data && !workspaceId);

  if (isProjectResolutionPending) {
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
            Project not found or private
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This project could not be loaded. If this is a public project, open
            it using the share link.
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
      <header className="relative z-40 border-b border-slate-200 bg-white">
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
            <Link
              href="/"
              className="inline-flex items-center rounded bg-slate-900 px-2 py-1 text-xs text-white transition-opacity hover:opacity-80"
            >
              ERD
            </Link>
            {isEditingProjectName ? (
              <input
                ref={projectNameInputRef}
                value={editingProjectName}
                onChange={(event) => setEditingProjectName(event.target.value)}
                onBlur={() => void commitProjectNameEdit()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    cancelProjectNameEdit();
                  }
                }}
                maxLength={140}
                className="h-7 w-full max-w-[220px] rounded-md border border-blue-300 px-2 text-sm font-semibold outline-none focus:border-blue-500 lg:max-w-[380px]"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={beginProjectNameEdit}
                className="max-w-[220px] truncate rounded px-1 text-left hover:bg-slate-100 lg:max-w-[380px]"
                title="Double-click to rename project"
              >
                {projectQuery.data.name}
              </button>
            )}
            <div className="ml-1 hidden items-center gap-1 text-xs font-medium text-slate-600 lg:flex">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  onBlur={() =>
                    setTimeout(() => setIsActionsMenuOpen(false), 200)
                  }
                  className="flex items-center gap-0.5 rounded px-2 py-1 hover:bg-slate-100"
                >
                  Actions
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${isActionsMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isActionsMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={handleOpenNewProject}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Project
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDuplicate}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Make a copy
                    </button>
                  </div>
                )}
              </div>
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="rounded px-2 py-1 hover:bg-slate-100"*/}
              {/*>*/}
              {/*  Edit*/}
              {/*</button>*/}
              {/*<button*/}
              {/*  type="button"*/}
              {/*  className="rounded px-2 py-1 hover:bg-slate-100"*/}
              {/*>*/}
              {/*  View*/}
              {/*</button>*/}
              {/*<div className="flex items-center gap-1 rounded px-2 py-1 text-slate-600">*/}
              {/*  <span>Help</span>*/}
              {/*</div>*/}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={initialView}
                onChange={(event) =>
                  updateProjectView(event.target.value as ProjectView)
                }
                className="h-7 rounded-md border border-slate-300 bg-white pl-2.5 pr-7 text-xs font-medium outline-none hover:bg-slate-50 focus:border-blue-500"
              >
                <option value="erd">ERD Diagram</option>
                <option value="dictionary">Data Dictionary</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1.5 right-2 h-3.5 w-3.5 text-slate-500" />
            </div>
            <button
              type="button"
              onClick={openShareDialog}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              Share
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
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                    Custom Types
                  </h3>
                  <button
                    type="button"
                    onClick={openCreateCustomTypeEditor}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Enum
                  </button>
                </div>

                {customTypeEditor.open ? (
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-700">
                        {customTypeEditor.mode === "create"
                          ? "New Enum"
                          : "Edit Enum"}
                      </p>
                      <button
                        type="button"
                        onClick={closeCustomTypeEditor}
                        className="rounded p-1 text-slate-500 hover:bg-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-slate-600">
                        Schema
                      </p>
                      <input
                        value={customTypeEditor.schemaName}
                        onChange={(event) =>
                          setCustomTypeEditor((current) => ({
                            ...current,
                            schemaName: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-slate-600">
                        Enum Name
                      </p>
                      <input
                        value={customTypeEditor.typeName}
                        onChange={(event) =>
                          setCustomTypeEditor((current) => ({
                            ...current,
                            typeName: event.target.value,
                          }))
                        }
                        placeholder="order_status"
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] font-semibold text-slate-600">
                        Values
                      </p>
                      <textarea
                        value={customTypeEditor.enumValuesText}
                        onChange={(event) =>
                          setCustomTypeEditor((current) => ({
                            ...current,
                            enumValuesText: event.target.value,
                          }))
                        }
                        placeholder={"draft\npaid\nshipped"}
                        className="h-24 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        One enum value per line.
                      </p>
                    </div>

                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={closeCustomTypeEditor}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveCustomType()}
                        className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                      >
                        {customTypeEditor.mode === "create" ? "Create" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="max-h-[62vh] space-y-2 overflow-auto pr-1">
                  {customTypes.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500">
                      No managed enums yet.
                    </div>
                  ) : (
                    customTypes.map((customType) => (
                      <div
                        key={customType.custom_type_id}
                        className="rounded-lg border border-slate-200 bg-white p-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {customType.type_name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {customType.schema_name} •{" "}
                              {customTypeUsageCounts[customType.type_name] ?? 0}{" "}
                              field
                              {(customTypeUsageCounts[customType.type_name] ??
                                0) === 1
                                ? ""
                                : "s"}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                openEditCustomTypeEditor(customType)
                              }
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                              title="Edit enum"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteCustomType(customType)}
                              className="rounded p-1 text-red-600 hover:bg-red-50"
                              title="Delete enum"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {customType.enum_values.map((value) => (
                            <span
                              key={`${customType.custom_type_id}-${value}`}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : sidebarMode === "importExport" ? (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold tracking-wide text-slate-700 uppercase">
                  Import / Export
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={openImportDialog}
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    <Database className="h-4 w-4" />
                    Import...
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExportDialogOpen(true)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export...
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void createSnapshot()}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  <Save className="h-4 w-4" />
                  Snapshot
                </button>
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
                        const sortedTableIndexes = sortIndexes(
                          table.indexes ?? [],
                        );
                        const isEditingIndexForTable =
                          indexEditorDraft?.tableId === table.table_id;
                        const filteredIndexColumns = isEditingIndexForTable
                          ? table.columns.filter((column) => {
                              const keyword =
                                indexEditorDraft?.columnSearch
                                  .trim()
                                  .toLowerCase() ?? "";
                              if (!keyword) {
                                return true;
                              }
                              return column.column_name
                                .toLowerCase()
                                .includes(keyword);
                            })
                          : table.columns;

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

                              {editingSidebarTableId === table.table_id ? (
                                <input
                                  ref={sidebarRenameInputRef}
                                  value={editingSidebarTableName}
                                  onChange={(event) =>
                                    setEditingSidebarTableName(
                                      event.target.value,
                                    )
                                  }
                                  onBlur={() =>
                                    void commitSidebarTableRename(table)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void commitSidebarTableRename(table);
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      cancelSidebarTableRename();
                                    }
                                  }}
                                  className="min-w-0 flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-[14px] font-semibold outline-none focus:border-blue-500"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTableId(table.table_id);
                                    setExpandedTables((current) => ({
                                      ...current,
                                      [table.table_id]: true,
                                    }));
                                  }}
                                  onDoubleClick={() =>
                                    beginSidebarTableRename(table)
                                  }
                                  className="min-w-0 flex-1 truncate text-left text-[15px] font-semibold"
                                  title="Double-click to rename"
                                >
                                  {table.display_name ?? table.table_name}
                                </button>
                              )}

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
                                                setColumnNameDrafts(
                                                  (current) => ({
                                                    ...current,
                                                    [column.column_id]:
                                                      event.target.value,
                                                  }),
                                                )
                                              }
                                              onBlur={() => {
                                                const nextValue = (
                                                  columnNameDrafts[
                                                    column.column_id
                                                  ] ?? ""
                                                ).trim();
                                                if (
                                                  nextValue &&
                                                  nextValue !==
                                                    column.column_name
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
                                              value={getColumnTypeName(column)}
                                              onChange={(event) => {
                                                void updateColumn(
                                                  table.table_id,
                                                  column.column_id,
                                                  buildColumnTypePayload(
                                                    event.target.value,
                                                    customTypeNameSet,
                                                  ),
                                                );
                                              }}
                                              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-blue-500"
                                            >
                                              {customTypeOptions.map(
                                                (option) => (
                                                  <option
                                                    key={option}
                                                    value={option}
                                                  >
                                                    {option}
                                                  </option>
                                                ),
                                              )}
                                            </select>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                void updateColumn(
                                                  table.table_id,
                                                  column.column_id,
                                                  {
                                                    is_nullable:
                                                      !column.is_nullable,
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
                                                openFieldAttributes(
                                                  table,
                                                  column,
                                                )
                                              }
                                              className="rounded-md border border-slate-300 p-1 text-slate-500 hover:bg-slate-50 text-xs font-bold"
                                              title="Field attributes"
                                            >
                                              <MoreVertical className="mx-auto h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        );
                                      })}
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
                                            void addColumnToTable(
                                              table.table_id,
                                            );
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
                                        {customTypeOptions.map((option) => (
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
                                    <div className="mt-2 rounded-md border border-slate-200 p-1.5">
                                      <div className="mb-1 flex items-center justify-between gap-2">
                                        <div className="text-xs font-semibold text-slate-700">
                                          Indexes
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openCreateIndexEditor(table)
                                          }
                                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold hover:bg-slate-50"
                                        >
                                          <Plus className="h-3 w-3" />
                                          Add Index
                                        </button>
                                      </div>

                                      <div className="space-y-1">
                                        {sortedTableIndexes.length === 0 ? (
                                          <p className="rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500">
                                            No indexes yet.
                                          </p>
                                        ) : (
                                          sortedTableIndexes.map((index) => (
                                            <div
                                              key={index.index_id}
                                              className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
                                            >
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-[11px] font-semibold text-slate-700">
                                                  {index.index_name}
                                                </p>
                                                <p className="truncate text-[10px] text-slate-500">
                                                  {(
                                                    index.column_names ?? []
                                                  ).join(", ") ||
                                                    "no columns"}{" "}
                                                  • {index.method}
                                                  {index.is_unique
                                                    ? " • unique"
                                                    : ""}
                                                </p>
                                              </div>
                                              {index.source === "user" ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      openEditIndexEditor(
                                                        table,
                                                        index,
                                                      )
                                                    }
                                                    className="rounded p-1 text-slate-500 hover:bg-slate-200"
                                                    title="Edit index"
                                                  >
                                                    <Pencil className="h-3 w-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void deleteIndexFromTable(
                                                        table,
                                                        index,
                                                      )
                                                    }
                                                    className="rounded p-1 text-red-600 hover:bg-red-100"
                                                    title="Delete index"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </button>
                                                </>
                                              ) : (
                                                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                                  System
                                                </span>
                                              )}
                                            </div>
                                          ))
                                        )}
                                      </div>

                                      {isEditingIndexForTable &&
                                      indexEditorDraft ? (
                                        <div className="mt-2 space-y-1.5 rounded-md border border-blue-200 bg-blue-50/40 p-2">
                                          <div className="text-[11px] font-semibold text-slate-700">
                                            {indexEditorDraft.mode === "create"
                                              ? "Create Index"
                                              : "Edit Index"}
                                          </div>

                                          <input
                                            value={indexEditorDraft.indexName}
                                            onChange={(event) =>
                                              patchIndexEditorDraft({
                                                indexName: event.target.value,
                                              })
                                            }
                                            placeholder="index_name"
                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                                          />

                                          <div className="grid grid-cols-[1fr_auto] gap-1">
                                            <select
                                              value={indexEditorDraft.method}
                                              onChange={(event) =>
                                                patchIndexEditorDraft({
                                                  method: event.target
                                                    .value as (typeof indexMethodOptions)[number],
                                                })
                                              }
                                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
                                            >
                                              {indexMethodOptions.map(
                                                (method) => (
                                                  <option
                                                    key={method}
                                                    value={method}
                                                  >
                                                    {method}
                                                  </option>
                                                ),
                                              )}
                                            </select>
                                            <label className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600">
                                              <input
                                                type="checkbox"
                                                checked={
                                                  indexEditorDraft.isUnique
                                                }
                                                onChange={(event) =>
                                                  patchIndexEditorDraft({
                                                    isUnique:
                                                      event.target.checked,
                                                  })
                                                }
                                                className="h-3.5 w-3.5"
                                              />
                                              Unique
                                            </label>
                                          </div>

                                          <input
                                            value={
                                              indexEditorDraft.columnSearch
                                            }
                                            onChange={(event) =>
                                              patchIndexEditorDraft({
                                                columnSearch:
                                                  event.target.value,
                                              })
                                            }
                                            placeholder="Search columns..."
                                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                                          />

                                          <div className="max-h-24 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
                                            {filteredIndexColumns.map(
                                              (column) => {
                                                const isChecked =
                                                  indexEditorDraft.selectedColumnIds.includes(
                                                    column.column_id,
                                                  );
                                                return (
                                                  <label
                                                    key={`${table.table_id}-${column.column_id}`}
                                                    className="flex items-center gap-2 rounded px-1 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isChecked}
                                                      onChange={() =>
                                                        toggleIndexColumnSelection(
                                                          column.column_id,
                                                        )
                                                      }
                                                      className="h-3.5 w-3.5"
                                                    />
                                                    <span className="truncate">
                                                      {column.column_name}
                                                    </span>
                                                  </label>
                                                );
                                              },
                                            )}
                                          </div>

                                          <div className="space-y-1 rounded-md border border-slate-200 bg-white p-1">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase">
                                              Selected Order
                                            </p>
                                            {indexEditorDraft.selectedColumnIds
                                              .length === 0 ? (
                                              <p className="text-[10px] text-slate-500">
                                                Select at least one column.
                                              </p>
                                            ) : (
                                              indexEditorDraft.selectedColumnIds.map(
                                                (columnId, indexPosition) => {
                                                  const columnName =
                                                    table.columns.find(
                                                      (column) =>
                                                        column.column_id ===
                                                        columnId,
                                                    )?.column_name ?? columnId;
                                                  return (
                                                    <div
                                                      key={columnId}
                                                      className="flex items-center justify-between gap-1 rounded border border-slate-200 px-1 py-0.5 text-[10px] text-slate-600"
                                                    >
                                                      <span className="truncate">
                                                        {columnName}
                                                      </span>
                                                      <div className="flex items-center gap-0.5">
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            moveSelectedIndexColumn(
                                                              columnId,
                                                              "up",
                                                            )
                                                          }
                                                          disabled={
                                                            indexPosition === 0
                                                          }
                                                          className="rounded border border-slate-300 p-0.5 disabled:opacity-40"
                                                        >
                                                          <ArrowUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            moveSelectedIndexColumn(
                                                              columnId,
                                                              "down",
                                                            )
                                                          }
                                                          disabled={
                                                            indexPosition ===
                                                            indexEditorDraft
                                                              .selectedColumnIds
                                                              .length -
                                                              1
                                                          }
                                                          className="rounded border border-slate-300 p-0.5 disabled:opacity-40"
                                                        >
                                                          <ArrowDown className="h-3 w-3" />
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                },
                                              )
                                            )}
                                          </div>

                                          <textarea
                                            value={indexEditorDraft.commentText}
                                            onChange={(event) =>
                                              patchIndexEditorDraft({
                                                commentText: event.target.value,
                                              })
                                            }
                                            placeholder="Index comment (optional)"
                                            className="h-12 w-full rounded-md border border-slate-300 p-1.5 text-xs outline-none focus:border-blue-500"
                                          />

                                          <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-2 text-[10px] text-slate-100">
                                            {buildIndexSqlPreview(
                                              table,
                                              indexEditorDraft,
                                            )}
                                          </pre>

                                          <div className="flex justify-end gap-1">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                closeIndexEditor(table.table_id)
                                              }
                                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void saveIndexEditorDraft()
                                              }
                                              className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                                            >
                                              Save Index
                                            </button>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="pt-0.5">
                                      <div className="mb-1 text-xs font-semibold text-slate-600">
                                        Comments
                                      </div>
                                      <textarea
                                        value={
                                          tableComments[table.table_id] ??
                                          table.comment_text ??
                                          ""
                                        }
                                        onChange={(event) =>
                                          setTableComments((current) => ({
                                            ...current,
                                            [table.table_id]:
                                              event.target.value,
                                          }))
                                        }
                                        onBlur={() =>
                                          void commitTableCommentDraft(table)
                                        }
                                        placeholder="No comments"
                                        className="h-12 w-full rounded-md border border-slate-300 p-1.5 text-xs outline-none focus:border-blue-500"
                                      />
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
            <button
              type="button"
              aria-label="Resize sidebar"
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
            {isDataDictionaryView ? (
              <div className="h-full overflow-y-auto bg-slate-100/60 p-4">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-4 pb-10">
                  {tables.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        No tables yet.
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Create a table to start your data dictionary.
                      </p>
                      <button
                        type="button"
                        onClick={() => openCreateTableDialog()}
                        className="mt-3 inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        <Table2 className="h-3.5 w-3.5" />
                        Add Table
                      </button>
                    </div>
                  ) : null}

                  {tables.map((table) => {
                    const orderedColumns = getOrderedColumns(table);
                    const isSelected = selectedTableId === table.table_id;
                    const foreignKeyColumnIds = new Set(
                      relationships
                        .filter(
                          (relationship) =>
                            relationship.from_table_id === table.table_id,
                        )
                        .map((relationship) => relationship.from_column_id),
                    );
                    const referencedColumnIds = new Set(
                      relationships
                        .filter(
                          (relationship) =>
                            relationship.to_table_id === table.table_id,
                        )
                        .map((relationship) => relationship.to_column_id),
                    );
                    const columnDraft = newColumnByTable[table.table_id] ?? {
                      name: "",
                      dataType: "text",
                      isNullable: true,
                    };
                    const tableDescriptionDraft =
                      tableComments[table.table_id] ?? table.comment_text ?? "";
                    const isNewFieldVisible =
                      openNewFieldTableId === table.table_id;
                    const isNewRowActive =
                      activeFieldRow?.tableId === table.table_id &&
                      activeFieldRow.rowId === "new";

                    return (
                      <article
                        key={table.table_id}
                        className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                          isSelected
                            ? "border-blue-400 shadow-blue-100"
                            : "border-slate-200"
                        }`}
                      >
                        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTableId(table.table_id)}
                            className="min-w-0 text-left"
                          >
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {table.display_name ?? table.table_name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {table.schema_name}.{table.table_name} •{" "}
                              {orderedColumns.length} field
                              {orderedColumns.length === 1 ? "" : "s"}
                            </p>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenNewFieldTableId((current) => {
                                  const shouldOpen = current !== table.table_id;
                                  setActiveFieldRow(
                                    shouldOpen
                                      ? {
                                          tableId: table.table_id,
                                          rowId: "new",
                                        }
                                      : null,
                                  );
                                  return shouldOpen ? table.table_id : null;
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {isNewFieldVisible
                                ? "Hide New Field"
                                : "Add New Field"}
                            </button>

                            <div
                              className="relative"
                              data-table-actions-menu="true"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenTableActionsMenuId((current) =>
                                    current === table.table_id
                                      ? null
                                      : table.table_id,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                <Settings2 className="h-3.5 w-3.5" />
                                Settings
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>

                              {openTableActionsMenuId === table.table_id ? (
                                <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openCreateRelationshipDialog(
                                        table.table_id,
                                      );
                                      setOpenTableActionsMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    <Link2 className="h-3.5 w-3.5" />
                                    Relation
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSidebarMode("tables");
                                      setSelectedTableId(table.table_id);
                                      setExpandedTables((current) => ({
                                        ...current,
                                        [table.table_id]: true,
                                      }));
                                      openCreateIndexEditor(table);
                                      setOpenTableActionsMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    <Database className="h-3.5 w-3.5" />
                                    New Index
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEditTableDialog(table.table_id);
                                      setOpenTableActionsMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit Table
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void deleteTable(table.table_id);
                                      setOpenTableActionsMenuId(null);
                                    }}
                                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </header>

                        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-1.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Description
                          </span>
                          <input
                            value={tableDescriptionDraft}
                            onChange={(event) =>
                              setTableComments((current) => ({
                                ...current,
                                [table.table_id]: event.target.value,
                              }))
                            }
                            onBlur={() => void commitTableCommentDraft(table)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void commitTableCommentDraft(table);
                              }
                            }}
                            className="w-full rounded-md border border-transparent bg-transparent px-2 py-0.5 text-xs text-slate-600 outline-none focus:border-slate-300 focus:bg-white"
                          />
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-[1180px] w-full text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                              <tr>
                                <th
                                  className="relative px-2 py-2 text-center font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("drag"),
                                  }}
                                >
                                  Drag
                                  <button
                                    type="button"
                                    aria-label="Resize Drag column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "drag")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("key"),
                                  }}
                                >
                                  Key
                                  <button
                                    type="button"
                                    aria-label="Resize Key column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "key")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("column"),
                                  }}
                                >
                                  Column
                                  <button
                                    type="button"
                                    aria-label="Resize Column column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "column")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("type"),
                                  }}
                                >
                                  Type
                                  <button
                                    type="button"
                                    aria-label="Resize Type column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "type")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("notNull"),
                                  }}
                                >
                                  Not Null
                                  <button
                                    type="button"
                                    aria-label="Resize Not Null column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "notNull")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("default"),
                                  }}
                                >
                                  Default
                                  <button
                                    type="button"
                                    aria-label="Resize Default column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "default")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("example"),
                                  }}
                                >
                                  Example
                                  <button
                                    type="button"
                                    aria-label="Resize Example column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "example")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width:
                                      getDictionaryHeaderWidth("description"),
                                  }}
                                >
                                  Description
                                  <button
                                    type="button"
                                    aria-label="Resize Description column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(
                                        event,
                                        "description",
                                      )
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                                <th
                                  className="relative px-2 py-2 text-left font-semibold"
                                  style={{
                                    width: getDictionaryHeaderWidth("actions"),
                                  }}
                                >
                                  Actions
                                  <button
                                    type="button"
                                    aria-label="Resize Actions column"
                                    onMouseDown={(event) =>
                                      startColumnWidthResize(event, "actions")
                                    }
                                    className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderedColumns.map((column) => {
                                const nameDraft =
                                  columnNameDrafts[column.column_id] ??
                                  column.column_name;
                                const defaultDraft =
                                  columnDefaultDrafts[column.column_id] ??
                                  column.default_sql ??
                                  "";
                                const exampleDraft =
                                  columnExampleDrafts[column.column_id] ??
                                  column.example_value ??
                                  "";
                                const descriptionDraft =
                                  columnComments[column.column_id] ??
                                  column.comment_text ??
                                  "";
                                const isDragging =
                                  draggedColumn?.columnId === column.column_id;
                                const isDragOver =
                                  dragOverColumnId === column.column_id &&
                                  draggedColumn?.columnId !== column.column_id;
                                const isForeignKey = foreignKeyColumnIds.has(
                                  column.column_id,
                                );
                                const isReferencedKey = referencedColumnIds.has(
                                  column.column_id,
                                );
                                const isActiveRow =
                                  activeFieldRow?.tableId === table.table_id &&
                                  activeFieldRow.rowId === column.column_id;

                                return (
                                  <tr
                                    key={column.column_id}
                                    draggable={!isColumnResizing}
                                    onClick={() =>
                                      setActiveFieldRow({
                                        tableId: table.table_id,
                                        rowId: column.column_id,
                                      })
                                    }
                                    onDragStart={(event) => {
                                      setDraggedColumn({
                                        tableId: table.table_id,
                                        columnId: column.column_id,
                                      });
                                      event.dataTransfer.effectAllowed = "move";
                                      event.dataTransfer.setData(
                                        "text/plain",
                                        column.column_id,
                                      );
                                    }}
                                    onDragOver={(event) => {
                                      event.preventDefault();
                                      setDragOverColumnId(column.column_id);
                                    }}
                                    onDragLeave={() => {
                                      setDragOverColumnId((current) =>
                                        current === column.column_id
                                          ? null
                                          : current,
                                      );
                                    }}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      void dropColumnOnTarget(
                                        table.table_id,
                                        column.column_id,
                                      );
                                      setDraggedColumn(null);
                                      setDragOverColumnId(null);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedColumn(null);
                                      setDragOverColumnId(null);
                                    }}
                                    className={`border-t border-slate-200 transition-colors ${
                                      isDragOver
                                        ? "bg-blue-50"
                                        : isDragging
                                          ? "bg-slate-100"
                                          : isActiveRow
                                            ? "bg-white"
                                            : "bg-slate-50/50"
                                    }`}
                                  >
                                    <td
                                      className="px-2 py-1.5 text-center"
                                      style={{
                                        width: getDictionaryHeaderWidth("drag"),
                                      }}
                                    >
                                      <span className="inline-flex cursor-grab rounded p-1 text-slate-500 hover:bg-slate-100">
                                        <GripVertical className="h-3.5 w-3.5" />
                                      </span>
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width: getDictionaryHeaderWidth("key"),
                                      }}
                                    >
                                      <div className="flex flex-wrap gap-1">
                                        {column.is_primary_key ? (
                                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                            PK
                                          </span>
                                        ) : null}
                                        {isForeignKey ? (
                                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                            FK
                                          </span>
                                        ) : null}
                                        {isReferencedKey &&
                                        !column.is_primary_key ? (
                                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                            REF
                                          </span>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width:
                                          getDictionaryHeaderWidth("column"),
                                      }}
                                    >
                                      <input
                                        value={nameDraft}
                                        onChange={(event) =>
                                          setColumnNameDrafts((current) => ({
                                            ...current,
                                            [column.column_id]:
                                              event.target.value,
                                          }))
                                        }
                                        onFocus={() =>
                                          setActiveFieldRow({
                                            tableId: table.table_id,
                                            rowId: column.column_id,
                                          })
                                        }
                                        onBlur={() =>
                                          void commitColumnNameDraft(
                                            table.table_id,
                                            column,
                                          )
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            void commitColumnNameDraft(
                                              table.table_id,
                                              column,
                                            );
                                          }
                                        }}
                                        className={getDictionaryInputClass(
                                          isActiveRow,
                                        )}
                                      />
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width: getDictionaryHeaderWidth("type"),
                                      }}
                                    >
                                      {isActiveRow ? (
                                        <div className="relative">
                                          <select
                                            value={getColumnTypeName(column)}
                                            onFocus={() =>
                                              setActiveFieldRow({
                                                tableId: table.table_id,
                                                rowId: column.column_id,
                                              })
                                            }
                                            onChange={(event) => {
                                              void updateColumn(
                                                table.table_id,
                                                column.column_id,
                                                buildColumnTypePayload(
                                                  event.target.value,
                                                  customTypeNameSet,
                                                ),
                                              );
                                            }}
                                            className={`${getDictionaryInputClass(
                                              true,
                                            )} appearance-none pr-5 text-[11px]`}
                                          >
                                            {customTypeOptions.map((option) => (
                                              <option
                                                key={option}
                                                value={option}
                                              >
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                          <ChevronDown className="pointer-events-none absolute top-1.5 right-1 h-3.5 w-3.5 text-slate-500" />
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActiveFieldRow({
                                              tableId: table.table_id,
                                              rowId: column.column_id,
                                            })
                                          }
                                          className="w-full px-2 py-1 text-left text-[11px] text-slate-700"
                                        >
                                          {getColumnTypeName(column)}
                                        </button>
                                      )}
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width:
                                          getDictionaryHeaderWidth("notNull"),
                                      }}
                                    >
                                      {isActiveRow ? (
                                        <div className="relative">
                                          <select
                                            value={
                                              column.is_nullable
                                                ? "nullable"
                                                : "not_null"
                                            }
                                            onFocus={() =>
                                              setActiveFieldRow({
                                                tableId: table.table_id,
                                                rowId: column.column_id,
                                              })
                                            }
                                            onChange={(event) => {
                                              void updateColumn(
                                                table.table_id,
                                                column.column_id,
                                                {
                                                  is_nullable:
                                                    event.target.value ===
                                                    "nullable",
                                                },
                                              );
                                            }}
                                            className={`${getDictionaryInputClass(
                                              true,
                                            )} appearance-none pr-5 text-[11px] font-semibold`}
                                          >
                                            <option value="not_null">
                                              NOT NULL
                                            </option>
                                            <option value="nullable">
                                              NULLABLE
                                            </option>
                                          </select>
                                          <ChevronDown className="pointer-events-none absolute top-1.5 right-1 h-3.5 w-3.5 text-slate-500" />
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setActiveFieldRow({
                                              tableId: table.table_id,
                                              rowId: column.column_id,
                                            })
                                          }
                                          className="w-full px-2 py-1 text-left text-[11px] font-semibold text-slate-700"
                                        >
                                          {column.is_nullable
                                            ? "NULLABLE"
                                            : "NOT NULL"}
                                        </button>
                                      )}
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width:
                                          getDictionaryHeaderWidth("default"),
                                      }}
                                    >
                                      <input
                                        value={defaultDraft}
                                        onChange={(event) =>
                                          setColumnDefaultDrafts((current) => ({
                                            ...current,
                                            [column.column_id]:
                                              event.target.value,
                                          }))
                                        }
                                        onFocus={() =>
                                          setActiveFieldRow({
                                            tableId: table.table_id,
                                            rowId: column.column_id,
                                          })
                                        }
                                        onBlur={() =>
                                          void commitColumnDefaultDraft(
                                            table.table_id,
                                            column,
                                          )
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            void commitColumnDefaultDraft(
                                              table.table_id,
                                              column,
                                            );
                                          }
                                        }}
                                        className={getDictionaryInputClass(
                                          isActiveRow,
                                        )}
                                      />
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width:
                                          getDictionaryHeaderWidth("example"),
                                      }}
                                    >
                                      <input
                                        value={exampleDraft}
                                        onChange={(event) =>
                                          setColumnExampleDrafts((current) => ({
                                            ...current,
                                            [column.column_id]:
                                              event.target.value,
                                          }))
                                        }
                                        onFocus={() =>
                                          setActiveFieldRow({
                                            tableId: table.table_id,
                                            rowId: column.column_id,
                                          })
                                        }
                                        onBlur={() =>
                                          void commitColumnExampleDraft(
                                            table.table_id,
                                            column,
                                          )
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            void commitColumnExampleDraft(
                                              table.table_id,
                                              column,
                                            );
                                          }
                                        }}
                                        className={getDictionaryInputClass(
                                          isActiveRow,
                                        )}
                                      />
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width:
                                          getDictionaryHeaderWidth(
                                            "description",
                                          ),
                                      }}
                                    >
                                      <input
                                        value={descriptionDraft}
                                        onChange={(event) =>
                                          setColumnComments((current) => ({
                                            ...current,
                                            [column.column_id]:
                                              event.target.value,
                                          }))
                                        }
                                        onFocus={() =>
                                          setActiveFieldRow({
                                            tableId: table.table_id,
                                            rowId: column.column_id,
                                          })
                                        }
                                        onBlur={() =>
                                          void commitColumnCommentDraft(
                                            table.table_id,
                                            column,
                                          )
                                        }
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            void commitColumnCommentDraft(
                                              table.table_id,
                                              column,
                                            );
                                          }
                                        }}
                                        className={getDictionaryInputClass(
                                          isActiveRow,
                                        )}
                                      />
                                    </td>
                                    <td
                                      className="px-2 py-1.5"
                                      style={{
                                        width:
                                          getDictionaryHeaderWidth("actions"),
                                      }}
                                    >
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void moveColumnByStep(
                                              table.table_id,
                                              column.column_id,
                                              "up",
                                            )
                                          }
                                          disabled={
                                            orderedColumns[0]?.column_id ===
                                            column.column_id
                                          }
                                          className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                          title="Move up"
                                        >
                                          <ArrowUp className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void moveColumnByStep(
                                              table.table_id,
                                              column.column_id,
                                              "down",
                                            )
                                          }
                                          disabled={
                                            orderedColumns[
                                              orderedColumns.length - 1
                                            ]?.column_id === column.column_id
                                          }
                                          className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                          title="Move down"
                                        >
                                          <ArrowDown className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveFieldRow({
                                              tableId: table.table_id,
                                              rowId: column.column_id,
                                            });
                                            openFieldAttributes(table, column);
                                          }}
                                          className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                                          title="Field attributes"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveFieldRow({
                                              tableId: table.table_id,
                                              rowId: column.column_id,
                                            });
                                            void deleteColumnFromTable(
                                              table.table_id,
                                              column.column_id,
                                            );
                                          }}
                                          className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50"
                                          title="Delete field"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}

                              {isNewFieldVisible ? (
                                <tr
                                  onClick={() =>
                                    setActiveFieldRow({
                                      tableId: table.table_id,
                                      rowId: "new",
                                    })
                                  }
                                  className={`border-t border-slate-200 ${
                                    isNewRowActive
                                      ? "bg-blue-50/70"
                                      : "bg-slate-50"
                                  }`}
                                >
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width: getDictionaryHeaderWidth("drag"),
                                    }}
                                  />
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width: getDictionaryHeaderWidth("key"),
                                    }}
                                  >
                                    <span className="text-[11px] font-semibold text-blue-700">
                                      NEW FIELD
                                    </span>
                                  </td>
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width: getDictionaryHeaderWidth("column"),
                                    }}
                                  >
                                    <input
                                      value={columnDraft.name}
                                      onChange={(event) =>
                                        setNewColumnDraft(table.table_id, {
                                          name: event.target.value,
                                        })
                                      }
                                      onFocus={() =>
                                        setActiveFieldRow({
                                          tableId: table.table_id,
                                          rowId: "new",
                                        })
                                      }
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                          event.preventDefault();
                                          void addColumnToTable(table.table_id);
                                        }
                                      }}
                                      className={getDictionaryInputClass(
                                        isNewRowActive,
                                      )}
                                    />
                                  </td>
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width: getDictionaryHeaderWidth("type"),
                                    }}
                                  >
                                    <div className="relative">
                                      <select
                                        value={columnDraft.dataType}
                                        onChange={(event) =>
                                          setNewColumnDraft(table.table_id, {
                                            dataType: event.target.value,
                                          })
                                        }
                                        onFocus={() =>
                                          setActiveFieldRow({
                                            tableId: table.table_id,
                                            rowId: "new",
                                          })
                                        }
                                        className={`${getDictionaryInputClass(
                                          isNewRowActive,
                                        )} appearance-none pr-5 text-[11px]`}
                                      >
                                        {customTypeOptions.map((option) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute top-1.5 right-1 h-3.5 w-3.5 text-slate-500" />
                                    </div>
                                  </td>
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width:
                                        getDictionaryHeaderWidth("notNull"),
                                    }}
                                  >
                                    <div className="relative">
                                      <select
                                        value={
                                          columnDraft.isNullable
                                            ? "nullable"
                                            : "not_null"
                                        }
                                        onChange={(event) =>
                                          setNewColumnDraft(table.table_id, {
                                            isNullable:
                                              event.target.value === "nullable",
                                          })
                                        }
                                        onFocus={() =>
                                          setActiveFieldRow({
                                            tableId: table.table_id,
                                            rowId: "new",
                                          })
                                        }
                                        className={`${getDictionaryInputClass(
                                          isNewRowActive,
                                        )} appearance-none pr-5 text-[11px] font-semibold`}
                                      >
                                        <option value="not_null">
                                          NOT NULL
                                        </option>
                                        <option value="nullable">
                                          NULLABLE
                                        </option>
                                      </select>
                                      <ChevronDown className="pointer-events-none absolute top-1.5 right-1 h-3.5 w-3.5 text-slate-500" />
                                    </div>
                                  </td>
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width:
                                        getDictionaryHeaderWidth("default"),
                                    }}
                                  />
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width:
                                        getDictionaryHeaderWidth("example"),
                                    }}
                                  />
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width:
                                        getDictionaryHeaderWidth("description"),
                                    }}
                                  />
                                  <td
                                    className="px-2 py-2"
                                    style={{
                                      width:
                                        getDictionaryHeaderWidth("actions"),
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void addColumnToTable(table.table_id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                                    >
                                      <Table2 className="h-3.5 w-3.5" />
                                      Add New
                                    </button>
                                  </td>
                                </tr>
                              ) : null}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : (
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
                dataTypeOptions={customTypeOptions}
                onInlineRenameTable={(tableId, nextDisplayName) => {
                  void renameTableInline(tableId, nextDisplayName);
                }}
                onInlineRenameColumn={(tableId, columnId, nextColumnName) => {
                  void renameColumnInline(tableId, columnId, nextColumnName);
                }}
                onInlineChangeColumnType={(tableId, columnId, nextTypeName) => {
                  void changeColumnTypeInline(tableId, columnId, nextTypeName);
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
                onEditRelationship={openEditRelationshipDialog}
                onDeleteRelationship={(id) => void deleteRelationship(id)}
              />
            )}
          </div>
        </section>
      </main>

      {/* Dialogs */}
      <CreateProjectDialog
        key={workspaceId ?? "dashboard-create"}
        open={isCreateProjectOpen}
        onOpenChange={setIsCreateProjectOpen}
        workspaceId={workspaceId || null}
        workspaces={workspaces}
      />

      {isMounted &&
        isDuplicateProjectOpen &&
        createPortal(
          <div
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
            role="dialog"
          >
            <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-slate-900">
                  Make a copy
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Duplicate this project, including its schema, into a new
                  project.
                </p>
                <form onSubmit={handleDuplicateProject} className="mt-4">
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="duplicateName"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        New Project Name
                      </label>
                      <input
                        id="duplicateName"
                        value={duplicateProjectName}
                        onChange={(e) => {
                          setDuplicateProjectName(e.target.value);
                          if (duplicateProjectError) {
                            setDuplicateProjectError("");
                          }
                        }}
                        aria-invalid={Boolean(duplicateProjectError)}
                        className={`w-full rounded-md px-3 py-2 text-sm outline-none focus:ring-1 ${
                          duplicateProjectError
                            ? "border border-rose-400 focus:border-rose-500 focus:ring-rose-500"
                            : "border border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        }`}
                      />
                      {duplicateProjectError ? (
                        <p className="mt-1.5 text-sm text-rose-600">
                          {duplicateProjectError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsDuplicateProjectOpen(false);
                        setDuplicateProjectError("");
                      }}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      disabled={duplicateProjectMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        !duplicateProjectName.trim() ||
                        duplicateProjectMutation.isPending
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {duplicateProjectMutation.isPending && (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      )}
                      Copy Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {tableDialog.open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {tableDialog.mode === "create" ? "New Table" : "Edit Table"}
              </h3>
              <button
                type="button"
                onClick={closeTableDialog}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
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

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="block text-xs font-semibold text-slate-600">
                    Fields
                  </p>
                  <button
                    type="button"
                    onClick={addTableDialogField}
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    + Add field
                  </button>
                </div>

                {tableDialogFields.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500">
                    No fields yet. Add at least one field.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tableDialogFields.map((field, index) => (
                      <div
                        key={field.localId}
                        className="grid grid-cols-[minmax(0,1fr)_132px_44px_44px_auto] items-center gap-2"
                      >
                        <input
                          value={field.columnName}
                          onChange={(event) =>
                            updateTableDialogField(field.localId, {
                              columnName: event.target.value,
                            })
                          }
                          placeholder="column_name"
                          className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                        />
                        <select
                          value={field.dataType}
                          onChange={(event) =>
                            updateTableDialogField(field.localId, {
                              dataType: event.target.value,
                            })
                          }
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                        >
                          {customTypeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            updateTableDialogField(field.localId, {
                              isNullable: !field.isNullable,
                            })
                          }
                          className="rounded-md border border-slate-300 bg-slate-100 px-1 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                          title={
                            field.isNullable
                              ? "Nullable column"
                              : "NOT NULL column"
                          }
                        >
                          {field.isNullable ? "?" : "N"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateTableDialogField(field.localId, {
                              isPrimaryKey: !field.isPrimaryKey,
                              isUnique: !field.isPrimaryKey
                                ? true
                                : field.isUnique,
                              isNullable: !field.isPrimaryKey
                                ? false
                                : field.isNullable,
                            })
                          }
                          className={`rounded-md border px-1 py-1 ${
                            field.isPrimaryKey
                              ? "border-amber-400 bg-amber-100 text-amber-700"
                              : "border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title={
                            field.isPrimaryKey
                              ? "Primary key"
                              : "Mark as primary key"
                          }
                        >
                          <KeyRound className="mx-auto h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              moveTableDialogField(field.localId, "up")
                            }
                            disabled={index === 0}
                            className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Move up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              moveTableDialogField(field.localId, "down")
                            }
                            disabled={index === tableDialogFields.length - 1}
                            className="rounded-md border border-slate-300 p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Move down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeTableDialogField(field.localId)
                            }
                            className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50"
                            title="Remove field"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTableDialog}
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

      {isImportDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-xl rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Import Schema</h3>
              <button
                type="button"
                onClick={() => setIsImportDialogOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 inline-flex rounded-md border border-slate-300 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setImportDialogTab("database")}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  importDialogTab === "database"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Database
              </button>
              <button
                type="button"
                onClick={() => setImportDialogTab("upload")}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  importDialogTab === "upload"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setImportDialogTab("paste")}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  importDialogTab === "paste"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Paste SQL
              </button>
            </div>

            <div className="space-y-3">
              {importDialogTab === "database" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={importHost}
                      onChange={(event) => setImportHost(event.target.value)}
                      placeholder="Host"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      value={importPort}
                      onChange={(event) =>
                        setImportPort(Number(event.target.value) || 5432)
                      }
                      placeholder="Port"
                      type="number"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      value={importDatabase}
                      onChange={(event) =>
                        setImportDatabase(event.target.value)
                      }
                      placeholder="Database"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      value={importUser}
                      onChange={(event) => setImportUser(event.target.value)}
                      placeholder="Username"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      value={importPassword}
                      onChange={(event) =>
                        setImportPassword(event.target.value)
                      }
                      placeholder="Password"
                      type="password"
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                    <select
                      value={importSslMode}
                      onChange={(event) => setImportSslMode(event.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="disable">SSL disable</option>
                      <option value="prefer">SSL prefer</option>
                      <option value="require">SSL require</option>
                    </select>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                    <p className="font-semibold">Connection status</p>
                    <p>
                      {visibleConnectionCheckStatus === "success"
                        ? visibleConnectionCheckMessage ||
                          "Connection successful."
                        : visibleConnectionCheckStatus === "failed"
                          ? visibleConnectionCheckMessage ||
                            "Connection failed."
                          : "Run test connection first."}
                    </p>
                  </div>

                  <div className="rounded-md border border-slate-200 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-700">
                        Schemas to import
                      </p>
                      <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={visibleImportAllSchemas}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setImportAllSchemas(checked);
                            if (checked) {
                              setSelectedImportSchemas(visibleImportSchemas);
                            }
                          }}
                        />
                        All schemas
                      </label>
                    </div>
                    <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                      {visibleImportSchemas.length === 0 ? (
                        <p className="text-xs text-slate-500">
                          No schemas loaded yet. Test connection first.
                        </p>
                      ) : (
                        visibleImportSchemas.map((schema) => (
                          <label
                            key={schema}
                            className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={
                                visibleImportAllSchemas ||
                                visibleSelectedImportSchemas.includes(schema)
                              }
                              disabled={visibleImportAllSchemas}
                              onChange={() =>
                                toggleImportSchemaSelection(schema)
                              }
                            />
                            <span>{schema}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : importDialogTab === "upload" ? (
                <>
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Upload a `.sql` file
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Supports PostgreSQL DDL and pg_dump schema output.
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                      Choose File
                      <input
                        type="file"
                        accept=".sql,text/sql,application/sql"
                        className="hidden"
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0] ?? null;
                          setImportSqlFile(selectedFile);
                        }}
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">
                      {importSqlFile
                        ? `Selected: ${importSqlFile.name}`
                        : "No file selected."}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                    File import replaces the current diagram schema with parsed
                    SQL tables and relationships.
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-slate-600">
                    Paste SQL DDL
                  </p>
                  <textarea
                    value={importSqlText}
                    onChange={(event) => setImportSqlText(event.target.value)}
                    placeholder="Paste CREATE TABLE / ALTER TABLE statements here..."
                    rows={12}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500"
                  />
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                    Pasted SQL import replaces the current diagram schema with
                    parsed tables and relationships.
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex justify-between gap-2">
              {importDialogTab === "database" ? (
                <button
                  type="button"
                  onClick={() => void testImportConnection()}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Test Connection
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportDialogOpen(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (importDialogTab === "database") {
                      void importSchemaFromPostgres();
                      return;
                    }
                    if (importDialogTab === "upload") {
                      void importSchemaFromSqlFile();
                      return;
                    }
                    void importSchemaFromSqlText();
                  }}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {isExportDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Export</h3>
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 inline-flex rounded-md border border-slate-300 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setExportDialogTab("sql")}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  exportDialogTab === "sql"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                SQL
              </button>
              <button
                type="button"
                onClick={() => setExportDialogTab("csv")}
                className={`rounded px-3 py-1 text-xs font-semibold ${
                  exportDialogTab === "csv"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dictionary
              </button>
            </div>

            <div className="space-y-3">
              {exportDialogTab === "sql" ? (
                <div>
                  <p className="mb-1 block text-xs font-semibold text-slate-600">
                    Target schema
                  </p>
                  <input
                    value={exportSchema}
                    onChange={(event) => setExportSchema(event.target.value)}
                    placeholder="public"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                  Dictionary file is generated by the backend so full data is
                  exported regardless of what is currently visible on screen.
                </div>
              )}

              <div className="rounded-md border border-slate-200 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">
                    Source schemas to export
                  </p>
                  <label className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={exportAllSchemas}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setExportAllSchemas(checked);
                        if (checked) {
                          setSelectedExportSchemas(availableExportSchemas);
                        }
                      }}
                    />
                    All schemas
                  </label>
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {availableExportSchemas.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No tables/schemas available to export.
                    </p>
                  ) : (
                    availableExportSchemas.map((schema) => (
                      <label
                        key={schema}
                        className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={
                            exportAllSchemas ||
                            selectedExportSchemas.includes(schema)
                          }
                          disabled={exportAllSchemas}
                          onChange={() => toggleExportSchemaSelection(schema)}
                        />
                        <span>{schema}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {exportDialogTab === "sql" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">
                      SQL output
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void copyExportSqlOutput()}
                        disabled={!exportSqlOutput.trim()}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={downloadExportSqlOutput}
                        disabled={!exportSqlOutput.trim()}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={exportSqlOutput}
                    readOnly
                    className="h-44 w-full rounded-md border border-slate-300 p-2 font-mono text-xs leading-relaxed"
                    placeholder="Click Generate SQL to build SQL output..."
                  />
                </div>
              ) : (
                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-700">
                      Dictionary format
                    </p>
                    <div className="space-y-1.5">
                      <label className="flex items-start gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs">
                        <input
                          type="radio"
                          name="dictionary-layout"
                          checked={dictionaryLayout === "table_grid"}
                          onChange={() => setDictionaryLayout("table_grid")}
                        />
                        <span>
                          Grid format (schema/table per row, tulad ng first
                          sample)
                        </span>
                      </label>
                      <label className="flex items-start gap-2 rounded border border-slate-200 bg-white px-2 py-1.5 text-xs">
                        <input
                          type="radio"
                          name="dictionary-layout"
                          checked={dictionaryLayout === "section_sheet"}
                          onChange={() => setDictionaryLayout("section_sheet")}
                        />
                        <span>
                          Section sheet format (grouped per table, tulad ng
                          second sample)
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-semibold text-slate-700">
                      File type
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="radio"
                          name="dictionary-file-type"
                          checked={dictionaryFileType === "csv"}
                          onChange={() => setDictionaryFileType("csv")}
                        />
                        CSV
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="radio"
                          name="dictionary-file-type"
                          checked={dictionaryFileType === "xlsx"}
                          onChange={() => setDictionaryFileType("xlsx")}
                        />
                        XLSX
                      </label>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Download is generated directly from backend.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsExportDialogOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (exportDialogTab === "sql") {
                    void exportSql();
                    return;
                  }
                  void exportDictionaryFile();
                }}
                disabled={
                  (exportDialogTab === "sql" && exportSqlMutation.isPending) ||
                  (exportDialogTab === "csv" &&
                    exportDictionaryMutation.isPending)
                }
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {exportDialogTab === "sql"
                  ? "Generate SQL"
                  : `Download ${dictionaryFileType.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isShareDialogOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Share settings</h3>
                <p className="text-xs text-slate-600">
                  Choose who can access this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareDialogOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {getAvailableShareAccessOptions(isAuthenticated).includes(
                "onlyMe",
              ) ? (
                <button
                  type="button"
                  onClick={() => void setProjectAccess("onlyMe")}
                  disabled={updateProjectVisibilityMutation.isPending}
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    shareAccessOption === "onlyMe"
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">
                    Only me
                  </p>
                  <p className="text-xs text-slate-600">
                    Private access for you and workspace members only.
                  </p>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void setProjectAccess("anyoneWithLink")}
                disabled={updateProjectVisibilityMutation.isPending}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  shareAccessOption === "anyoneWithLink"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">
                  Anyone with the link
                </p>
                <p className="text-xs text-slate-600">
                  Anyone with the share link can open this project.
                </p>
              </button>
            </div>

            {!isAuthenticated ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p>
                  Log in to unlock private sharing controls like{" "}
                  <strong>Only me</strong>.
                </p>
                <button
                  type="button"
                  onClick={redirectToLoginForSharing}
                  className="mt-2 inline-flex h-8 items-center rounded-md border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Log in
                </button>
              </div>
            ) : null}

            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Share link</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  readOnly
                  value={
                    typeof window !== "undefined" && shareSlug
                      ? `${window.location.origin}/share/${shareSlug}`
                      : ""
                  }
                  placeholder="Switch to 'Anyone with the link' to enable sharing."
                  className="h-9 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => void copyShareLink()}
                  disabled={
                    !shareSlug || shareAccessOption !== "anyoneWithLink"
                  }
                  className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsShareDialogOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Done
              </button>
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
                    checked={fieldAttributesDraft.primaryKey}
                    onChange={(event) =>
                      setFieldAttributesDraft((current) =>
                        current
                          ? {
                              ...current,
                              primaryKey: event.target.checked,
                              unique: event.target.checked
                                ? true
                                : current.unique,
                              isNullable: event.target.checked
                                ? false
                                : current.isNullable,
                            }
                          : current,
                      )
                    }
                  />
                  Primary Key
                </label>

                <label className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={fieldAttributesDraft.unique}
                    disabled={fieldAttributesDraft.primaryKey}
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

              <div className="grid grid-cols-2 gap-2">
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
                <div />
              </div>

              <div>
                <p className="mb-1 block text-xs font-semibold text-slate-600">
                  Not Null
                </p>
                <select
                  value={
                    fieldAttributesDraft.isNullable ? "nullable" : "not_null"
                  }
                  onChange={(event) =>
                    setFieldAttributesDraft((current) =>
                      current
                        ? {
                            ...current,
                            isNullable: event.target.value === "nullable",
                          }
                        : current,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500"
                >
                  <option value="not_null">NOT NULL</option>
                  <option value="nullable">NULLABLE</option>
                </select>
              </div>

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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <p className="mb-1 block text-xs font-semibold text-slate-600">
                  Example
                </p>
                <input
                  value={fieldAttributesDraft.example}
                  onChange={(event) =>
                    setFieldAttributesDraft((current) =>
                      current
                        ? {
                            ...current,
                            example: event.target.value,
                          }
                        : current,
                    )
                  }
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
                  placeholder="Notes or description"
                  className="h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
