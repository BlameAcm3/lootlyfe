# PostHog Approved Events

- `family_created` { `family_id` }
- `kid_added` { `family_id`, `kid_id`, `age_range` }
- `chore_created` { `family_id`, `chore_id`, `points`, `schedule_type` }
- `chore_completed` { `family_id`, `chore_id`, `kid_id`, `points_awarded` }
- `chore_approved` { `family_id`, `chore_id`, `kid_id`, `parent_id` }
- `points_awarded` { `family_id`, `kid_id`, `amount`, `source` }
- `reward_created` { `family_id`, `reward_id`, `cost` }
- `reward_redeemed` { `family_id`, `reward_id`, `kid_id`, `cost` }
- `reward_approved` { `family_id`, `reward_id`, `kid_id`, `parent_id` }
- `paywall_viewed` { `trigger` }
- `subscription_started` { `plan` }
- `ai_suggestion_shown` { `type`, `context` }
- `ai_suggestion_accepted` { `type`, `suggestion_id` }
