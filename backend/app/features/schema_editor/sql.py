INSERT_TABLE = """
SELECT *
FROM api.fn_table_create(
    p_diagram_id => %(diagram_id)s::uuid,
    p_schema_name => %(schema_name)s::text,
    p_table_name => %(table_name)s::text,
    p_display_name => %(display_name)s::text,
    p_comment_text => %(comment_text)s::text,
    p_pos_x => %(pos_x)s::numeric,
    p_pos_y => %(pos_y)s::numeric,
    p_color_hex => %(color_hex)s::text
);
"""

UPDATE_TABLE = """
SELECT *
FROM api.fn_table_update(
    p_diagram_id => %(diagram_id)s::uuid,
    p_table_id => %(table_id)s::uuid,
    p_schema_name => %(schema_name)s::text,
    p_table_name => %(table_name)s::text,
    p_comment_text => %(comment_text)s::text,
    p_pos_x => %(pos_x)s::numeric,
    p_pos_y => %(pos_y)s::numeric,
    p_color_hex => %(color_hex)s::text,
    p_is_deleted => %(is_deleted)s::boolean
);
"""

INSERT_COLUMN = """
SELECT *
FROM api.fn_column_create(
    p_table_id => %(table_id)s::uuid,
    p_column_name => %(column_name)s::text,
    p_ordinal_position => %(ordinal_position)s::integer,
    p_data_type => %(data_type)s::text,
    p_udt_name => %(udt_name)s::text,
    p_is_nullable => %(is_nullable)s::boolean,
    p_default_sql => %(default_sql)s::text,
    p_is_primary_key => %(is_primary_key)s::boolean,
    p_is_unique => %(is_unique)s::boolean,
    p_example_value => %(example_value)s::text,
    p_ui_width => %(ui_width)s::numeric,
    p_comment_text => %(comment_text)s::text
);
"""

INSERT_COLUMN_LEGACY_WITH_EXAMPLE_COMMENT = """
SELECT *
FROM api.fn_column_create(
    p_table_id => %(table_id)s::uuid,
    p_column_name => %(column_name)s::text,
    p_ordinal_position => %(ordinal_position)s::integer,
    p_data_type => %(data_type)s::text,
    p_udt_name => %(udt_name)s::text,
    p_is_nullable => %(is_nullable)s::boolean,
    p_default_sql => %(default_sql)s::text,
    p_is_primary_key => %(is_primary_key)s::boolean,
    p_is_unique => %(is_unique)s::boolean,
    p_example_value => %(example_value)s::text,
    p_comment_text => %(comment_text)s::text
);
"""

INSERT_COLUMN_LEGACY = """
SELECT *
FROM api.fn_column_create(
    p_table_id => %(table_id)s::uuid,
    p_column_name => %(column_name)s::text,
    p_ordinal_position => %(ordinal_position)s::integer,
    p_data_type => %(data_type)s::text,
    p_udt_name => %(udt_name)s::text,
    p_is_nullable => %(is_nullable)s::boolean,
    p_default_sql => %(default_sql)s::text,
    p_is_primary_key => %(is_primary_key)s::boolean,
    p_is_unique => %(is_unique)s::boolean
);
"""

UPDATE_COLUMN = """
SELECT *
FROM api.fn_column_update(
    p_table_id => %(table_id)s::uuid,
    p_column_id => %(column_id)s::uuid,
    p_column_name => %(column_name)s::text,
    p_ordinal_position => %(ordinal_position)s::integer,
    p_data_type => %(data_type)s::text,
    p_udt_name => %(udt_name)s::text,
    p_is_nullable => %(is_nullable)s::boolean,
    p_default_sql => %(default_sql)s::text,
    p_is_primary_key => %(is_primary_key)s::boolean,
    p_is_unique => %(is_unique)s::boolean,
    p_example_value => %(example_value)s::text,
    p_ui_width => %(ui_width)s::numeric,
    p_comment_text => %(comment_text)s::text
);
"""

UPDATE_COLUMN_LEGACY_WITH_EXAMPLE_COMMENT = """
SELECT *
FROM api.fn_column_update(
    p_table_id => %(table_id)s::uuid,
    p_column_id => %(column_id)s::uuid,
    p_column_name => %(column_name)s::text,
    p_ordinal_position => %(ordinal_position)s::integer,
    p_data_type => %(data_type)s::text,
    p_udt_name => %(udt_name)s::text,
    p_is_nullable => %(is_nullable)s::boolean,
    p_default_sql => %(default_sql)s::text,
    p_is_primary_key => %(is_primary_key)s::boolean,
    p_is_unique => %(is_unique)s::boolean,
    p_example_value => %(example_value)s::text,
    p_comment_text => %(comment_text)s::text
);
"""

UPDATE_COLUMN_LEGACY = """
SELECT *
FROM api.fn_column_update(
    p_table_id => %(table_id)s::uuid,
    p_column_id => %(column_id)s::uuid,
    p_column_name => %(column_name)s::text,
    p_ordinal_position => %(ordinal_position)s::integer,
    p_data_type => %(data_type)s::text,
    p_udt_name => %(udt_name)s::text,
    p_is_nullable => %(is_nullable)s::boolean,
    p_default_sql => %(default_sql)s::text,
    p_is_primary_key => %(is_primary_key)s::boolean,
    p_is_unique => %(is_unique)s::boolean
);
"""

DELETE_COLUMN = """
SELECT *
FROM api.fn_column_delete(
    p_table_id => %(table_id)s::uuid,
    p_column_id => %(column_id)s::uuid
);
"""

INSERT_CUSTOM_TYPE = """
SELECT *
FROM api.fn_custom_type_create(
    p_diagram_id => %(diagram_id)s::uuid,
    p_schema_name => %(schema_name)s,
    p_type_name => %(type_name)s,
    p_enum_values => %(enum_values)s::text[]
);
"""

UPDATE_CUSTOM_TYPE = """
SELECT *
FROM api.fn_custom_type_update(
    p_diagram_id => %(diagram_id)s::uuid,
    p_custom_type_id => %(custom_type_id)s::uuid,
    p_schema_name => %(schema_name)s,
    p_type_name => %(type_name)s,
    p_enum_values => %(enum_values)s::text[]
);
"""

DELETE_CUSTOM_TYPE = """
SELECT *
FROM api.fn_custom_type_delete(
    p_diagram_id => %(diagram_id)s::uuid,
    p_custom_type_id => %(custom_type_id)s::uuid
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

DELETE_RELATIONSHIP = """
SELECT *
FROM api.fn_relationship_delete(
    p_diagram_id => %(diagram_id)s::uuid,
    p_relationship_id => %(relationship_id)s::uuid
);
"""

INSERT_INDEX = """
SELECT *
FROM api.fn_index_create(
    p_table_id => %(table_id)s::uuid,
    p_index_name => %(index_name)s::text,
    p_method => %(method)s::text,
    p_is_unique => %(is_unique)s::boolean,
    p_comment_text => %(comment_text)s::text,
    p_column_ids => %(column_ids)s::uuid[]
);
"""

UPDATE_INDEX = """
SELECT *
FROM api.fn_index_update(
    p_table_id => %(table_id)s::uuid,
    p_index_id => %(index_id)s::uuid,
    p_index_name => %(index_name)s::text,
    p_method => %(method)s::text,
    p_is_unique => %(is_unique)s::boolean,
    p_comment_text => %(comment_text)s::text,
    p_column_ids => %(column_ids)s::uuid[]
);
"""

DELETE_INDEX = """
SELECT *
FROM api.fn_index_delete(
    p_table_id => %(table_id)s::uuid,
    p_index_id => %(index_id)s::uuid
);
"""
