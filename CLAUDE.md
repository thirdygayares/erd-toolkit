# ERD Toolkit - Claude Code Guidelines

## Project Overview

**ERD Toolkit** is a PostgreSQL-first Entity-Relationship Diagram editor that allows users to:
- Import existing PostgreSQL schemas
- Edit diagrams visually
- Export to SQL/DBML formats

The project is organized into three independent layers: Frontend (Next.js), Backend (FastAPI), and Database (PostgreSQL with Flyway).

## Tech Stack & Key Technologies

### Frontend
- **Framework**: Next.js 16, React 19, TypeScript
- **State Management**: TanStack React Query v5.90
- **HTTP**: Axios (centralized instance)
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI, Lucide Icons
- **Diagram Canvas**: React Flow (XYFlow)
- **Linting**: Biome 2.2.0
- **Package Manager**: pnpm

### Backend
- **Framework**: FastAPI
- **Validation**: Pydantic
- **Database Driver**: psycopg (native PostgreSQL)
- **Configuration**: Pydantic Settings with .env support
- **Architecture**: Feature-based modules with dependency injection

### Database
- **System**: PostgreSQL
- **Migrations**: Flyway (versioned SQL)
- **Security**: Row-Level Security (RLS) with PostgreSQL functions
- **Extensions**: pgcrypto, citext

## Architecture Patterns

### Frontend Layers

```
Components (UI)
    ↓
Hooks (TanStack Query + mutation/query wrappers)
    ↓
Services (API calls via axios)
    ↓
axios instance (with base URL, headers, CORS)
    ↓
Backend API
```

**Key Files:**
- `/frontend/src/lib/types.ts` - Single source of truth for API contracts
- `/frontend/src/lib/queryKeys.ts` - Cache key management
- `/frontend/src/services/*.ts` - API service classes
- `/frontend/src/hooks/**/*.ts` - TanStack Query hooks (per feature)

### Backend Layers

```
FastAPI Route (via Depends)
    ↓
RequestContext (from headers: X-User-Id, X-Share-Slug)
    ↓
Service (business logic)
    ↓
Database + SQL queries
    ↓
PostgreSQL RLS (enforces access)
```

**Feature Module Structure:**
```
/app/features/{feature}/
  ├── routers.py        # FastAPI endpoints (@router.post, etc.)
  ├── schemas.py        # Pydantic models (requests & responses)
  ├── services.py       # Business logic
  └── sql.py            # Raw SQL queries
```

### Database Pattern

- **RLS Enforcement**: Request context (user_id, share_slug, request_mode) passed via `set_config()` to PostgreSQL
- **Access Modes**:
  - `authenticated` - user-owned resources
  - `anonymous` - public resources with share slug
  - `guest` - read-only access
- **Migrations**: Flyway versioned files in `/database/sql/migrations/`

## Frontend Conventions

### Adding a New Feature

1. **Define Types** (in `/lib/types.ts`):
   ```typescript
   export interface MyResourceCreateRequest {
     name: string;
     // ...
   }
   export interface MyResourceResponse {
     resource_id: string;
     // ...
   }
   ```

2. **Create Service** (`/services/myService.ts`):
   ```typescript
   import { axiosInstance } from "@/lib/axiosInstance";
   import type { MyResourceResponse } from "@/lib/types";

   export class MyService {
     async getResource(id: string): Promise<MyResourceResponse> {
       const { data } = await axiosInstance.get<MyResourceResponse>(
         `/my-resources/${id}`
       );
       return data;
     }
   }
   ```

3. **Create Hooks** (`/hooks/myFeature/useGetMyResourceQuery.ts`):
   ```typescript
   "use client";
   import { useQuery } from "@tanstack/react-query";
   import { queryKeys } from "@/lib/queryKeys";
   import { MyService } from "@/services/myService";

   const service = new MyService();

   export function useGetMyResourceQuery(id: string) {
     return useQuery({
       queryKey: queryKeys.myResource.byId(id),
       queryFn: () => service.getResource(id),
     });
   }
   ```

4. **Use in Components**:
   ```typescript
   "use client";
   import { useGetMyResourceQuery } from "@/hooks/myFeature/useGetMyResourceQuery";

   export function MyComponent({ resourceId }: { resourceId: string }) {
     const { data, isLoading } = useGetMyResourceQuery(resourceId);
     return isLoading ? <div>Loading...</div> : <div>{data?.name}</div>;
   }
   ```

### Query Key Management

Use centralized query keys in `/lib/queryKeys.ts`:
```typescript
export const queryKeys = {
  myResource: {
    all: () => ["myResource"],
    byId: (id: string) => ["myResource", id],
  },
};
```

**Invalidation on success:**
```typescript
useMutation({
  mutationFn: (payload) => service.create(payload),
  onSuccess: (data) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.myResource.byId(data.id),
    });
  },
});
```

### Styling

- Use **Tailwind CSS** classes (no inline styles)
- Import Lucide icons: `import { IconName } from "lucide-react"`
- Use shadcn/ui Button, Dialog, etc. from Radix UI
- Keep components unstyled; let parent pass `className`

### Client Components

Always add `"use client"` at the top of files that use:
- React hooks (useState, useEffect, etc.)
- TanStack Query (useQuery, useMutation)
- Context API
- Event handlers

## Backend Conventions

### Adding a New Feature

1. **Create Feature Directory** (`/app/features/my_feature/`):
   ```
   /app/features/my_feature/
     ├── __init__.py
     ├── routers.py
     ├── schemas.py
     ├── services.py
     └── sql.py
   ```

2. **Define Schemas** (`schemas.py`):
   ```python
   from pydantic import BaseModel

   class MyResourceCreateRequest(BaseModel):
       name: str

   class MyResourceResponse(BaseModel):
       resource_id: str
       name: str
   ```

3. **Implement Service** (`services.py`):
   ```python
   from app.core.db import Database
   from app.core.context import RequestContext

   class MyFeatureService:
       def __init__(self, db: Database) -> None:
           self._db = db

       def create_resource(
           self, payload: MyResourceCreateRequest, ctx: RequestContext
       ) -> dict:
           with self._db.connection() as conn:
               Database.apply_request_context(conn, ctx)
               with conn.cursor() as cur:
                   cur.execute(
                       "SELECT my_feature.create_resource(%s, %s)",
                       (payload.name, str(ctx.current_user_id)),
                   )
                   return cur.fetchone()
   ```

4. **Define Routes** (`routers.py`):
   ```python
   from fastapi import APIRouter, Depends, status
   from app.core.context import RequestContext, get_request_context
   from app.core.db import get_db

   router = APIRouter(tags=["my-feature"])

   def get_service() -> MyFeatureService:
       return MyFeatureService(get_db())

   @router.post("/my-resources", response_model=MyResourceResponse, status_code=status.HTTP_201_CREATED)
   def create_resource(
       payload: MyResourceCreateRequest,
       ctx: RequestContext = Depends(get_request_context),
       service: MyFeatureService = Depends(get_service),
   ) -> MyResourceResponse:
       return MyResourceResponse(**service.create_resource(payload, ctx))
   ```

5. **Register Router** in `/app/api.py`:
   ```python
   import app.features.my_feature.routers as my_feature_router

   def register_routers(app: FastAPI) -> None:
       api_v1.include_router(my_feature_router.router)
   ```

### Request Context Usage

The `RequestContext` contains:
- `current_user_id` (UUID | None) - from `X-User-Id` header
- `share_slug` (str | None) - from `X-Share-Slug` header
- `request_mode` (str) - "authenticated", "anonymous", or "guest"

Always pass context to database and enforce access in SQL or Python:
```python
Database.apply_request_context(conn, ctx)
# PostgreSQL now enforces RLS based on current user/share_slug
```

### Database Queries

Use raw SQL via psycopg with proper parameterization:
```python
with conn.cursor() as cur:
    cur.execute(
        "SELECT * FROM my_table WHERE id = %s",
        (my_id,),  # Always use %s placeholder + tuple
    )
    return cur.fetchone()
```

Queries are automatically RLS-protected when context is applied.

## Database Conventions

### Adding a Migration

1. Create new file in `/database/sql/migrations/`:
   ```
   V20260228170000__feature_description.sql
   ```

2. Write idempotent SQL:
   ```sql
   -- Create table if not exists
   CREATE TABLE IF NOT EXISTS my_table (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       name TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT NOW()
   );

   -- RLS: Enable row-level security
   ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

   -- Policy: authenticated users see their own rows
   CREATE POLICY my_table_user_access ON my_table
       FOR ALL USING (
           CASE
               WHEN current_setting('app.current_user_uuid')::UUID IS NOT NULL
               THEN owner_id = current_setting('app.current_user_uuid')::UUID
               ELSE false
           END
       );
   ```

3. Run migrations:
   ```bash
   cd database
   flyway -configFiles=flyway.conf migrate
   ```

## Common Tasks

### Running the Project

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
# Open http://localhost:3000
```

**Backend:**
```bash
cd backend
# Create .env if needed (see config.py defaults)
pip install -r requirements.txt
python -m uvicorn main:app --reload
# API at http://localhost:8000, docs at /docs
```

**Database:**
```bash
cd database
flyway -configFiles=flyway.conf migrate
```

### Adding an API Endpoint

1. Update types in `/frontend/src/lib/types.ts`
2. Add method to service in `/frontend/src/services/*.ts`
3. Create hook in `/frontend/src/hooks/**/*.ts` with TanStack Query wrapper
4. Add router & schema to backend feature module
5. Register router in `/backend/app/api.py`
6. Use hook in component

### Cache Invalidation

After mutations, invalidate the query key:
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({
    queryKey: queryKeys.myResource.byId(data.id),
  });
}
```

This refetches the resource automatically.

### Error Handling

**Frontend:** Errors bubble from service → hook → component. Display in UI.

**Backend:** Use custom `AppError` or let PostgreSQL RLS return `InsufficientPrivilege`:
```python
from app.core.errors import AppError

if condition:
    raise AppError(status_code=400, message="Invalid request")
```

### Testing

- Frontend: Use your IDE's TypeScript checker (already strict mode)
- Backend: Tests in `/backend/tests/` (current state: scaffold)
- Database: Manually test migrations with `flyway migrate`

## Code Quality

### Linting & Formatting

**Frontend:**
```bash
cd frontend
pnpm lint      # Check with Biome
pnpm format    # Format with Biome
```

**Backend:**
- No strict linter configured yet; follow PEP 8

### Type Safety

- **Frontend**: TypeScript strict mode enabled
- **Backend**: Pydantic for validation; use type hints

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Frontend component | PascalCase | `MyComponent.tsx` |
| Frontend hook | useCamelCase | `useGetResourceQuery.ts` |
| Frontend service | PascalCase class | `class MyService {}` |
| Backend function | snake_case | `def create_resource()` |
| Backend table | snake_case | `my_resources` |
| URL path | kebab-case | `/api/v1/my-resources` |
| API response field | snake_case | `resource_id` |

## File Organization

```
erd-toolkit/
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages
│   │   ├── components/          # Organized by feature
│   │   ├── hooks/               # Query/mutation hooks (by feature)
│   │   ├── services/            # API services (one per feature)
│   │   └── lib/                 # types.ts, queryKeys.ts, utils
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── core/                # config, db, context, errors
│   │   └── features/            # Feature modules (routers, schemas, services)
│   ├── tests/
│   ├── api.py                   # Router registration
│   └── main.py                  # Entry point
├── database/
│   └── sql/migrations/          # Flyway .sql files
└── README.md
```

## Important Notes

1. **No Breaking Changes**: Always design migrations to be backward-compatible (IF NOT EXISTS, new columns with defaults)

2. **RLS is Your Shield**: Don't add Python-level access control; let PostgreSQL enforce via RLS

3. **Context is King**: Always extract & pass `RequestContext` through the stack

4. **Stateless**: No sessions or cookies; headers (X-User-Id, X-Share-Slug) are the source of truth

5. **Types First**: Define types in one place (`/lib/types.ts`) before implementing backend/frontend

6. **Feature-Based**: Group related code by feature, not by technology (all diagram code together, etc.)

## Quick Reference

| Task | Where | How |
|------|-------|-----|
| Add API type | `/frontend/src/lib/types.ts` | Add interface |
| Add API method | `/frontend/src/services/{feature}Service.ts` | Add async method |
| Add hook | `/frontend/src/hooks/{feature}/use*.ts` | Wrap service with useQuery/useMutation |
| Add endpoint | `/backend/app/features/{feature}/routers.py` | Add @router.post/get/patch |
| Add schema | `/backend/app/features/{feature}/schemas.py` | Add Pydantic BaseModel |
| Add logic | `/backend/app/features/{feature}/services.py` | Add method to service class |
| Add migration | `/database/sql/migrations/` | Create V{timestamp}__description.sql |
| Run tests | `cd frontend && pnpm lint` | Biome check/format |

---

**Last Updated**: 2026-02-28

For more details, see the README.md and architecture review documentation.
