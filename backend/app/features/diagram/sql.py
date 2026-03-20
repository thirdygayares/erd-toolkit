CREATE_DIAGRAM = """
SELECT *
FROM api.fn_diagram_create(
    p_workspace_id => %(workspace_id)s::uuid,
    p_project_id => %(project_id)s::uuid,
    p_name => %(name)s,
    p_description => %(description)s,
    p_actor_id => %(actor_id)s::uuid
);
"""

LIST_DIAGRAMS_BY_WORKSPACE = """
SELECT *
FROM api.fn_diagram_list_by_workspace(
    p_workspace_id => %(workspace_id)s::uuid
);
"""

GET_DIAGRAM = """
SELECT *
FROM api.fn_diagram_get(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

GET_TABLES = """
SELECT *
FROM api.fn_diagram_get_tables(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

GET_COLUMNS_BY_DIAGRAM = """
SELECT *
FROM api.fn_diagram_get_columns(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

GET_RELATIONSHIPS = """
SELECT *
FROM api.fn_diagram_get_relationships(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

GET_CUSTOM_TYPES = """
SELECT *
FROM api.fn_diagram_get_custom_types(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

CREATE_SNAPSHOT = """
SELECT *
FROM api.fn_diagram_snapshot_create(
    p_diagram_id => %(diagram_id)s::uuid,
    p_label => %(label)s,
    p_snapshot_payload => %(snapshot_payload)s::jsonb,
    p_actor_id => %(actor_id)s::uuid
);
"""
