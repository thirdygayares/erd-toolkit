INSERT_TABLE = """
SELECT *
FROM api.fn_table_create(
    p_diagram_id => %(diagram_id)s::uuid,
    p_schema_name => %(schema_name)s,
    p_table_name => %(table_name)s,
    p_display_name => %(display_name)s,
    p_pos_x => %(pos_x)s::numeric,
    p_pos_y => %(pos_y)s::numeric,
    p_color_hex => %(color_hex)s
);
"""

UPDATE_TABLE = """
SELECT *
FROM api.fn_table_update(
    p_diagram_id => %(diagram_id)s::uuid,
    p_table_id => %(table_id)s::uuid,
    p_display_name => %(display_name)s,
    p_pos_x => %(pos_x)s::numeric,
    p_pos_y => %(pos_y)s::numeric,
    p_color_hex => %(color_hex)s,
    p_is_deleted => %(is_deleted)s
);
"""

INSERT_COLUMN = """
SELECT *
FROM api.fn_column_create(
    p_table_id => %(table_id)s::uuid,
    p_column_name => %(column_name)s,
    p_ordinal_position => %(ordinal_position)s,
    p_data_type => %(data_type)s,
    p_udt_name => %(udt_name)s,
    p_is_nullable => %(is_nullable)s,
    p_default_sql => %(default_sql)s,
    p_is_primary_key => %(is_primary_key)s,
    p_is_unique => %(is_unique)s
);
"""

UPDATE_COLUMN = """
SELECT *
FROM api.fn_column_update(
    p_table_id => %(table_id)s::uuid,
    p_column_id => %(column_id)s::uuid,
    p_column_name => %(column_name)s,
    p_ordinal_position => %(ordinal_position)s,
    p_data_type => %(data_type)s,
    p_udt_name => %(udt_name)s,
    p_is_nullable => %(is_nullable)s,
    p_default_sql => %(default_sql)s,
    p_is_primary_key => %(is_primary_key)s,
    p_is_unique => %(is_unique)s
);
"""

INSERT_RELATIONSHIP = """
SELECT *
FROM api.fn_relationship_create(
    p_diagram_id => %(diagram_id)s::uuid,
    p_name => %(name)s,
    p_from_table_id => %(from_table_id)s::uuid,
    p_from_column_id => %(from_column_id)s::uuid,
    p_to_table_id => %(to_table_id)s::uuid,
    p_to_column_id => %(to_column_id)s::uuid,
    p_cardinality_from => %(cardinality_from)s,
    p_cardinality_to => %(cardinality_to)s,
    p_on_update_action => %(on_update_action)s,
    p_on_delete_action => %(on_delete_action)s,
    p_is_identifying => %(is_identifying)s
);
"""

UPDATE_RELATIONSHIP = """
SELECT *
FROM api.fn_relationship_update(
    p_diagram_id => %(diagram_id)s::uuid,
    p_relationship_id => %(relationship_id)s::uuid,
    p_name => %(name)s,
    p_cardinality_from => %(cardinality_from)s,
    p_cardinality_to => %(cardinality_to)s,
    p_on_update_action => %(on_update_action)s,
    p_on_delete_action => %(on_delete_action)s,
    p_is_identifying => %(is_identifying)s
);
"""

DELETE_RELATIONSHIP = """
SELECT *
FROM api.fn_relationship_delete(
    p_diagram_id => %(diagram_id)s::uuid,
    p_relationship_id => %(relationship_id)s::uuid
);
"""
