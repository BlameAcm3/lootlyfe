-- Quest scheduling + custom-quest accounting.
--
-- source_preset_id: the data/presetQuests.ts id this quest was instantiated
--   from; null means a fully custom quest. The free-tier custom_quests limit
--   counts rows where source_preset_id is null and archived_at is null.
-- archived_at: soft delete. Archived quests stop producing occurrences but
--   keep their completion history (quest_completions cascade on hard delete).
--
-- recurrence (jsonb, added in 006) is always written by the client as:
--   { "type": "once",    "date": "YYYY-MM-DD", ... }
--   { "type": "daily", ... }
--   { "type": "weekly",  "days": [0..6], ... }          -- 0 = Sunday
--   { "type": "monthly", "day": 1..31, ... }            -- clamped to month end
-- with optional shared fields:
--   "startDate" / "endDate": "YYYY-MM-DD" (inclusive bounds)
--   "window": { "start": "HH:MM", "end": "HH:MM" }      -- local wall clock
-- Occurrences are computed client-side (lib/recurrence.ts); the DB stores
-- only the rule. null recurrence = unscheduled (never due).

alter table public.quests
  add column source_preset_id text,
  add column archived_at timestamptz;
