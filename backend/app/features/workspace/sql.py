INSERT_WORKSPACE = """
SELECT *
FROM api.fn_workspace_create(
    p_name => %(name)s,
    p_slug => %(slug)s,
    p_owner_user_id => %(owner_user_id)s::uuid,
    p_workspace_mode => %(workspace_mode)s,
    p_actor_id => %(actor_id)s::uuid
);
"""
