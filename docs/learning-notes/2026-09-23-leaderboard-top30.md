# 랭킹 상위 30명 계약과 staging 검증

## 무엇을 바꿨나

공개 랭킹 entries를 100개에서 30개로 줄이고, 30위 밖의 현재 사용자는 `me` 필드로 계속 보여주도록 서버·Edge Function·클라이언트를 같은 계약으로 맞췄다. 이미 적용된 migration은 수정하지 않고 `202609230002_leaderboard_top30.sql`을 추가했다.

```sql
select * from decorated
order by score desc, achieved_at asc, public_id asc
limit 30
```

## 실제 staging 확인

31명 rollback fixture에서 공동 순위 `1, 1, 3`, 공개 목록 30명, 내 순위 31위, rollback과 transaction-local 검증 표식 정리를 확인했다. 실제 익명 replay smoke도 14개 통과·0개 실패였고 임시 사용자 정리 대상은 0개였다.

## 배운 점

- 화면에서만 30개를 자르면 네트워크와 DB는 여전히 100개를 처리하므로 서버·API·파서를 함께 제한해야 한다.
- `me`를 목록과 분리하면 짧은 목록을 유지하면서도 자신의 전체 순위를 잃지 않는다.
- fixture는 실제 플레이 증거가 아니므로 `fixtureBased=true`, `replayVerified=false`를 구분해 기록한다.

## 남은 검증

동시 판 최고값·만료·운영자 상태 변경, Gateway 한도, cron·백업, 실제 웹 오프라인 복구, iPhone/Hermes는 아직 별도 검증 대상이다. production에는 migration이나 fixture를 적용하지 않았다.
