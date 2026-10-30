-- Approved by the game owner in chat on 2026-10-30.
-- Operator-reported 131% after ad revival; NOT a server-replayed 131% proof.
-- Production only: fgojrxmpxpzdiwsktjsx. Existing best row only, no fabricated run.
-- Never lower a newer score; do not alter other players or rules partitions.
begin;
do $$
declare affected integer;
begin
  update private.best_scores b
  set score = greatest(b.score, 131),
      achieved_at = case when b.score < 131 then pg_catalog.clock_timestamp() else b.achieved_at end
  from private.players p
  where b.user_id = p.user_id
    and p.public_id = 'ef99e46b-ed9e-432d-a2a6-e7e67e8f7480'::uuid
    and p.nickname = '오똥비'
    and b.rules_version = 'nyang-v1-bc732af6f2a7ea66';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Expected exactly one approved best-score row; rolled back'; end if;
end $$;
select p.public_id, p.nickname, b.score, b.rules_version
from private.best_scores b join private.players p using (user_id)
where p.public_id = 'ef99e46b-ed9e-432d-a2a6-e7e67e8f7480'::uuid
and b.rules_version = 'nyang-v1-bc732af6f2a7ea66';
commit;
