# sync-containers Edge Function

컨테이너 추적 API를 호출해 운항 정보(선박명, ETA, 도착항)를 자동 갱신합니다.

## 지원 선사

| 선사 | 컨테이너 접두사 | API 키 환경변수 |
|------|----------------|----------------|
| Maersk | MRKU, MSKU, MRSU, TCKU, TGBU | `MAERSK_API_KEY` |
| Hapag-Lloyd | HLXU, HLCU, UACU, FSCU | `HAPAG_API_KEY` |

## 환경변수 설정

```bash
supabase secrets set MAERSK_API_KEY=<your_maersk_consumer_key>
supabase secrets set HAPAG_API_KEY=<your_hapag_api_key>
```

## 배포

```bash
supabase functions deploy sync-containers --project-ref roemjrdmccjpvcmmkper
```

## 크론 스케줄 설정 (매일 09:00 KST = 00:00 UTC)

Supabase Dashboard → Database → Cron Jobs → New Cron Job:

```
Schedule:  0 0 * * *
Command:   SELECT net.http_post(
             url := 'https://roemjrdmccjpvcmmkper.supabase.co/functions/v1/sync-containers',
             headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
           );
```

또는 CLI:

```bash
supabase functions deploy sync-containers --project-ref roemjrdmccjpvcmmkper
```

## 동작

1. `actual_arrival`이 null인 컨테이너를 조회
2. 접두사로 선사를 판별해 해당 API 호출
3. 선박명, ETA, 도착항을 업데이트
4. 미지원 선사는 skip (에러 아님)

## 응답 예시

```json
{ "updated": 5, "skipped": 2, "errors": 0 }
```
