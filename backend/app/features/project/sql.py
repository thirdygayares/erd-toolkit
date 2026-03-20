CREATE_PROJECT = """
SELECT *
FROM api.fn_project_create(
    p_workspace_id => %(workspace_id)s::uuid,
    p_name => %(name)s,
    p_visibility => %(visibility)s,
    p_description => %(description)s,
    p_allow_anonymous_edit => %(allow_anonymous_edit)s,
    p_share_slug => %(share_slug)s
);
"""

DUPLICATE_PROJECT = """
SELECT *
FROM api.fn_project_duplicate(
    p_project_id => %(project_id)s::uuid,
    p_name => %(name)s
);
"""

GET_PROJECT_BY_SHARE = """
SELECT *
FROM api.fn_project_get_by_share_slug(
    p_share_slug => %(share_slug)s
)
LIMIT 1;
"""

SET_PROJECT_VISIBILITY = """
SELECT *
FROM api.fn_project_set_visibility(
    p_project_id => %(project_id)s::uuid,
    p_visibility => %(visibility)s,
    p_allow_anonymous_edit => %(allow_anonymous_edit)s
);
"""

GET_PROJECT_BY_ID = """
SELECT *
FROM api.fn_project_get(
    p_project_id => %(project_id)s::uuid
)
LIMIT 1;
"""

LIST_PROJECTS = """
SELECT *
FROM api.fn_project_list_for_current_user();
"""
