import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { loadKernel } from './verify-leaderboard.mjs';

// Generates an isolated rollback fixture. It never connects to a database.
const kernel = await loadKernel();
const flags = { mockAdsEnabled: false }, input = { left: false, right: false };
let parent = kernel.transition(kernel.createInitialState(), { type: 'START', runId: 7, seed: 42 }, flags).state;
const tick = (state, direction = 0, mock = false) => kernel.transition(state, {
  type: 'TICK', dt: 1 / 120, input: direction ? { left: direction === -1, right: direction === 1 } : input,
}, { mockAdsEnabled: mock }).state;
for (let i = 0; i < 360; i++) parent = tick(parent);
while (parent.screen === 'playing') parent = tick(parent, 1);
let child = kernel.transition(parent, { type: 'REQUEST_AD' }, { mockAdsEnabled: true }).state;
for (let i = 0; i < 960; i++) child = tick(child, 0, true);
child = { ...child, run: { ...child.run, stepIndex: 0 } };
let terminal = child;
while (terminal.screen === 'playing') terminal = tick(terminal, 1);
const migration = (await readFile('supabase/migrations/202610300001_ranked_revival.sql', 'utf8'))
  .replace(/^begin;\r?$/m, '').replace(/^commit;\r?$/m, '');
const json = state => `'${JSON.stringify(state)}'::jsonb`;
const sql = `-- GENERATED rollback-only staging fixture. No production target allowed.
begin;
set local nyang.verification_environment = 'staging';
set local nyang.verified_project_ref = 'tadokcpealpwjfyjovuy';
${migration}
do $$
declare u uuid := pg_catalog.gen_random_uuid(); other_u uuid := pg_catalog.gen_random_uuid();
  parent_id uuid; child_id uuid; child_retry uuid; initial jsonb := ${json(child)};
  terminal jsonb := ${json(terminal)}; board jsonb; receipt jsonb;
begin
  if current_setting('nyang.verified_project_ref') <> 'tadokcpealpwjfyjovuy' then raise exception 'WRONG_TARGET'; end if;
  insert into auth.users(id) values(u),(other_u);
  perform public.rank_upsert_profile(u, '부활검증냥');
  perform public.rank_upsert_profile(other_u, '다른검증냥');
  insert into private.runs(user_id,engine_run_id,seed,rules_version,state_json,total_ticks,status,finalized_at,accepted_seq,last_digest,receipt_json,issued_at,last_accepted_at,expires_at)
    values(u,7,42,'revival-test',${json(parent)},${parent.run.stepIndex},'finalized',clock_timestamp(),0,repeat('b',64),'{}'::jsonb,
      clock_timestamp()-interval '1 hour',clock_timestamp(),clock_timestamp()+interval '24 hours') returning id into parent_id;
  insert into private.best_scores(user_id,rules_version,score,source_run_id) values(u,'legacy-test',131,parent_id);
  child_id := (public.rank_start_revived_run(u,parent_id,initial)->>'runId')::uuid;
  child_retry := (public.rank_start_revived_run(u,parent_id,initial)->>'runId')::uuid;
  if child_id <> child_retry then raise exception 'NON_IDEMPOTENT_CHILD'; end if;
  begin
    perform public.rank_start_revived_run(other_u,parent_id,initial);
    raise exception 'FOREIGN_PARENT_ACCEPTED';
  exception when others then if sqlerrm not like '%FORBIDDEN%' then raise; end if; end;
  begin
    perform public.rank_start_revived_run(u,child_id,initial);
    raise exception 'SECOND_REVIVE_ACCEPTED';
  exception when others then if sqlerrm not like '%PROOF_REJECTED%' then raise; end if; end;
  update private.runs set issued_at=clock_timestamp()-interval '1 hour' where id=child_id;
  perform public.rank_commit_chunk(u,child_id,0,repeat('a',64),terminal,${terminal.run.stepIndex},true);
  receipt := public.rank_finalize_run(u,child_id);
  if (receipt->>'bestScore')::int <> 131 or (receipt->>'score')::int <> ${Math.floor(terminal.run.distanceM)}
    then raise exception 'GLOBAL_BEST_LOST'; end if;
  if receipt is distinct from public.rank_finalize_run(u,child_id) then raise exception 'RECEIPT_CHANGED'; end if;
  board := public.rank_get_board(u,'new-current-test');
  if (board#>>'{me,score}')::int <> 131 then raise exception 'LEGACY_SCORE_NOT_VISIBLE'; end if;
  if (select count(*) from private.best_scores where user_id=u) <> 2 then raise exception 'HISTORICAL_SCORE_OVERWRITTEN'; end if;
  if has_function_privilege('anon','public.rank_start_revived_run(uuid,uuid,jsonb)','execute')
    or has_function_privilege('authenticated','public.rank_start_revived_run(uuid,uuid,jsonb)','execute')
    then raise exception 'PUBLIC_REVIVAL_RPC'; end if;
end $$;
select true as revival_and_global_board_assertions_passed;
rollback;
select not exists(select 1 from information_schema.columns where table_schema='private' and table_name='runs' and column_name='parent_run_id') as migration_rolled_back;
`;
await mkdir('output', { recursive: true });
await writeFile('output/revival-db-check.sql', sql);
console.log('Generated rollback-only staging SQL: output/revival-db-check.sql');
