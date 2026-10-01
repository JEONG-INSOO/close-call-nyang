-- Read-only evidence for App Privacy. Execute ONLY against the confirmed
-- production project fgojrxmpxpzdiwsktjsx. No account or log values are returned.
BEGIN READ ONLY;

SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'audit_log_entries'
ORDER BY ordinal_position;

SELECT
  count(*) AS audit_rows,
  bool_or(nullif(to_jsonb(a)->>'ip_address', '') IS NOT NULL) AS any_ip_recorded,
  bool_or(coalesce((to_jsonb(a)->'payload') ? 'actor_id', false)
       OR coalesce((to_jsonb(a)->'payload') ? 'user_id', false)) AS any_account_linked,
  bool_or(coalesce((to_jsonb(a)->'payload') ? 'action', false)) AS any_action_recorded
FROM auth.audit_log_entries AS a;

ROLLBACK;
