-- READ ONLY. Execute only after selecting nyang-staging / tadokcpealpwjfyjovuy.
-- Counts only the six temporary Auth users listed in docs/leaderboard-operations.md.
with target(user_id) as (values
  ('e0053120-ece7-4d77-b709-fec9b1736660'::uuid),
  ('aff05fd6-6384-4c00-84fe-7526af9a78ee'::uuid),
  ('a3f4d547-2e9b-4c35-bcf4-b8742ada4c85'::uuid),
  ('abb74487-6d77-46d1-bdb6-aa8f329fdd5c'::uuid),
  ('00d1fdaf-82b8-4244-bcf1-f1ff3a299dca'::uuid),
  ('7c9521df-5e62-400d-935b-309edeed8ccb'::uuid)
), public_ids as (
  select p.public_id from private.players p join target t using (user_id)
)
select
  (select count(*) from auth.users u join target t on t.user_id = u.id) as auth_users,
  (select count(*) from private.players p join target t using (user_id)) as players,
  (select count(*) from private.best_scores b join target t using (user_id)) as best_scores,
  (select count(*) from private.runs r join target t using (user_id)) as runs,
  (select count(*) from private.nickname_reports n
    where n.reporter_user_id in (select user_id from target)
       or n.target_public_id in (select public_id from public_ids)) as related_reports,
  (select count(*) from private.deletion_receipts d join target t using (user_id)
    where d.status = 'pending_auth_delete') as pending_deletions,
  (select count(*) from private.deletion_receipts d join target t using (user_id)
    where d.status = 'complete') as completed_tombstones;
