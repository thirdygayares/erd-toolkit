CREATE_EXPORT_JOB = """
SELECT *
FROM api.fn_export_job_create(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

MARK_EXPORT_SUCCESS = """
SELECT api.fn_export_job_mark_success(
    p_export_job_id => %(export_job_id)s::uuid,
    p_sql_output => %(sql_output)s,
    p_diff_summary => %(diff_summary)s::jsonb
);
"""

MARK_EXPORT_FAILED = """
SELECT api.fn_export_job_mark_failed(
    p_export_job_id => %(export_job_id)s::uuid,
    p_error_text => %(error_text)s
);
"""

GET_TABLES = """
SELECT *
FROM api.fn_export_get_tables_v2(
    p_diagram_id => %(diagram_id)s::uuid
);
"""

GET_COLUMNS = """
SELECT *
FROM api.fn_export_get_columns_v2(
    p_table_id => %(table_id)s::uuid
);
"""

GET_RELATIONSHIPS = """
SELECT *
FROM api.fn_export_get_relationships(
    p_diagram_id => %(diagram_id)s::uuid
);
"""
