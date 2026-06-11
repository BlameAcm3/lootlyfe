# PostHog Approved Events

All events fire in parent (NPC) mode only — never from adventurer mode or anonymous (kid device)
sessions. In adventurer mode, analytics is fully disabled unless
`EXPO_PUBLIC_ADVENTURER_ANALYTICS_ENABLED=true` (see `src/shared/lib/analytics.ts`); it ships as
`false` because the Apple Kids Category prohibits third-party analytics transmitting
device/identifiable data.

- `guild_created` { `guild_id` }
- `adventurer_added` { `guild_id`, `adventurer_id`, `age_bucket`, `theme_id` }
- `quest_created` { `guild_id`, `quest_id`, `gold_reward`, `xp_reward` }
- `quest_completed` { `guild_id`, `quest_id`, `adventurer_id` }
- `quest_approved` { `guild_id`, `quest_id`, `adventurer_id`, `npc_id` }
- `gold_awarded` { `guild_id`, `adventurer_id`, `amount`, `source` }
- `loot_created` { `guild_id`, `loot_id`, `gold_cost` }
- `loot_redeemed` { `guild_id`, `loot_id`, `adventurer_id`, `gold_cost` }
- `redemption_approved` { `guild_id`, `loot_id`, `adventurer_id`, `npc_id` }
- `device_paired` { `guild_id`, `adventurer_id` }
- `paywall_viewed` { `trigger` }
- `subscription_started` { `plan` }
- `ai_suggestion_shown` { `type`, `context` }
- `ai_suggestion_accepted` { `type`, `suggestion_id` }
