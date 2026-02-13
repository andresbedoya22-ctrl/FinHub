# Finny Premium v1 Smoke Runbook

Phase: Fase 6 (G1/G2/G3)

## Scope
- Lite/Premium gate.
- Premium contextual responses based on case/doc/status.
- Anti-spam and quiet hours guardrails.

## Preconditions
1. Apply migration `supabase/migrations/20260213203000_finny_premium_v1.sql`.
2. Authenticated user with dashboard access.
3. `OPENAI_API_KEY` configured for LLM path.

## Checks
1. Open dashboard and launch Finny widget.
2. Ask FAQ-like question (`machtiging`) and verify response mode is FAQ.
3. Ask non-FAQ question and verify LLM response.
4. For a user with paid/advanced case, confirm premium behavior:
   - LLM still responds.
   - Context-driven suggestions reference current case/document progression.
5. Spam guard:
   - Send repeated same question 4+ times quickly.
   - Expect blocked response (`repeat_spam`).
6. Rate guard:
   - Burst messages over limit (Lite lower than Premium).
   - Expect 429 with rate-limit error.
7. Quiet hours:
   - PATCH `/api/assistant/settings` with `quietHoursEnabled=true`, narrow current hour range.
   - In Lite, expect blocked response due to quiet hours.

## Data validation
1. Verify events in `finny_chat_events` for:
   - `mode`: `faq`, `llm`, `blocked`, `error`
   - `tier`: `lite`/`premium`
   - `blocked_reason`: `rate_limit`/`repeat_spam`/`quiet_hours`
2. Verify user settings row in `finny_user_settings`.
