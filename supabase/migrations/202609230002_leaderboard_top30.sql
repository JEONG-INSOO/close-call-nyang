-- Forward-only change: keep 202609210001 immutable and expose only the top 30 rows.
-- The full personal rank remains in `me` for authenticated callers.
begin;

create or replace function public.rank_get_board(p_user_id uuid, p_rules_version text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_board jsonb;
begin
  if p_user_id is not null then perform private.rank_check_subject(p_user_id); end if;
  if p_rules_version is null or pg_catalog.char_length(p_rules_version) not between 1 and 128 then
    perform private.rank_fail('INVALID_INPUT');
  end if;
  -- One statement/snapshot for list AND me. Filter moderation BEFORE shared rank.
  with ranked as materialized (
    select p.user_id, p.public_id, p.nickname, b.score, b.achieved_at,
      rank() over (order by b.score desc) as place
    from private.best_scores b join private.players p on p.user_id = b.user_id
    where b.rules_version = p_rules_version and p.status = 'active'
  ), decorated as materialized (
    select user_id, score, achieved_at, public_id,
      pg_catalog.jsonb_build_object('publicId', public_id, 'nickname', nickname,
        'score', score, 'rank', place, 'achievedAt', achieved_at,
        'isMe', (user_id = p_user_id) is true) as entry from ranked
  ), top_rows as (
    select * from decorated order by score desc, achieved_at asc, public_id asc limit 30
  ) select pg_catalog.jsonb_build_object(
    'entries', coalesce((select pg_catalog.jsonb_agg(entry order by score desc, achieved_at asc, public_id asc)
      from top_rows), '[]'::jsonb),
    'me', (select entry from decorated where user_id = p_user_id),
    'rulesVersion', p_rules_version, 'fetchedAt', pg_catalog.clock_timestamp()) into v_board;
  return v_board;
end;
$$;

commit;
