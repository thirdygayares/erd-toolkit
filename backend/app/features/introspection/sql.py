GET_DIAGRAM_WORKSPACE = """
SELECT *
FROM api.fn_diagram_get_workspace(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

UPSERT_DB_CONNECTION = """
SELECT *
FROM api.fn_db_connection_upsert(
    p_workspace_id => %(workspace_id)s::uuid,
    p_name => %(name)s,
    p_host => %(host)s,
    p_port => %(port)s,
    p_database_name => %(database_name)s,
    p_username => %(username)s,
    p_password_secret_ref => %(password_secret_ref)s,
    p_ssl_mode => %(ssl_mode)s
);
"""

CREATE_IMPORT_JOB = """
SELECT *
FROM api.fn_import_job_create(
    p_diagram_id => %(diagram_id)s::uuid,
    p_connection_id => %(connection_id)s::uuid
);
"""

MARK_IMPORT_JOB_SUCCESS = """
SELECT api.fn_import_job_mark_success(
    p_import_job_id => %(import_job_id)s::uuid,
    p_result_summary => %(result_summary)s
);
"""

MARK_IMPORT_JOB_FAILED = """
SELECT api.fn_import_job_mark_failed(
    p_import_job_id => %(import_job_id)s::uuid,
    p_error_text => %(error_text)s
);
"""

CLEAR_RELATIONSHIPS = """
SELECT api.fn_diagram_clear_relationships(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

CLEAR_COLUMNS = """
SELECT api.fn_diagram_clear_columns(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

CLEAR_TABLES = """
SELECT api.fn_diagram_clear_tables(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

INSERT_TABLE = """
SELECT *
FROM api.fn_import_insert_table(
    p_diagram_id => %(diagram_id)s::uuid,
    p_schema_name => %(schema_name)s,
    p_table_name => %(table_name)s,
    p_display_name => %(display_name)s,
    p_pos_x => %(pos_x)s::numeric,
    p_pos_y => %(pos_y)s::numeric
);
"""

INSERT_COLUMN = """
SELECT *
FROM api.fn_import_insert_column(
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

INSERT_RELATIONSHIP = """
SELECT *
FROM api.fn_import_insert_relationship(
    p_diagram_id => %(diagram_id)s::uuid,
    p_name => %(name)s,
    p_from_table_id => %(from_table_id)s::uuid,
    p_from_column_id => %(from_column_id)s::uuid,
    p_to_table_id => %(to_table_id)s::uuid,
    p_to_column_id => %(to_column_id)s::uuid,
    p_on_update_action => %(on_update_action)s,
    p_on_delete_action => %(on_delete_action)s
);
"""
