# ERD Toolkit Features

## Product Summary
PostgreSQL-first ERD application with React Flow canvas: import schema, edit visually, export SQL back to PostgreSQL/Flyway.

## Access and Sharing
- Project visibility:
  - `public`: can open by share link (auth optional).
  - `private`: only owner/workspace members can access.
- Guest usage supported for Phase 1 public MVP.
- Registered users can own multiple workspaces.

## MVP Features (Phase 1)

### 1) Project and Diagram Lifecycle
- Create workspace/project/diagram.
- Create public project without mandatory login.
- Open project by share link.
- Save updates to database (persistent drafts).
- Manual snapshot/version save.

### 2) Header and Menu
- `Actions`: new, import, sync, export SQL, delete.
- `Edit`: undo, redo, revert local changes.
- `View`: zoom in/out, fit view, center selected table.
- `Help`: shortcuts and docs.

### 3) Sidebar + Config Panels
- Tabs:
  - Tables
  - Refs
  - Custom Types
  - Visuals (Areas/Notes)
  - SQL/DBML
- Filter/search table list.
- Add table from sidebar.
- Table action menu:
  - edit table
  - add field
  - add index
  - duplicate table
  - delete table

### 4) Canvas (React Flow)
- Node-based table cards.
- Edge-based relationships with cardinality styling.
- Drag/drop node movement with persisted positions.
- Context menu on node.
- Zoom, pan, minimap, fit-view.

### 5) Schema Editing
- Table CRUD.
- Column CRUD (name, type, nullability, default, PK/FK flags).
- Relationship CRUD (source/target, cardinality, on-delete/on-update).
- Index and check constraint editing.

### 6) Import and Sync
- Import metadata from PostgreSQL:
  - tables
  - columns
  - keys/relationships
  - indexes
  - custom types
- Re-sync and show change/drift summary.

### 7) Export
- Export deterministic PostgreSQL SQL diff.
- Export DBML.
- Export summary with warnings for risky operations.

## Phase 2+ Features
- Authentication and private project enforcement.
- Workspace member roles (`owner/admin/editor/viewer`).
- Comment threads and collaboration presence.
- Conflict handling for concurrent updates.
- Advanced Postgres objects (views, policies, triggers).

## Acceptance Criteria (Phase 1 MVP)
- Guest can create and edit public project with saved state.
- Share link opens same diagram and allows continued work.
- User can perform table/column/relationship CRUD from sidebar and canvas.
- Import -> edit -> export works on PostgreSQL end-to-end.

