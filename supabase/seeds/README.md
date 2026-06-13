# Seeds

Manual, deliberately-run SQL fixtures. These are **not** part of `supabase db reset`
(only `./seed.sql` is, per `config.toml` → `[db.seed].sql_paths`), so they never
run by accident.

| File | Purpose |
| --- | --- |
| `demo.sql` | TestFlight demo + App Store screenshot fixture. Populates one guild with 2 adventurers, 12 quests, streak history, loot, a pending redemption, and a wishlist proposal. |

> The repeatable streak unit-test fixture lives at `../seed.sql` (the 3-day
> fixture `db reset` auto-loads); `demo.sql` here is the richer, screenshot-ready set.

## demo.sql — what it creates

Everything flows through the **real** server pipeline (completions are inserted
`approved`, so the 013 grant trigger computes streaks/gold/XP and the 006 ledger
trigger updates each profile). Nothing is hand-faked.

- Target guild upgraded to **`premium`** (both theme packs + unlimited content visible).
- **Pip** — high-fantasy / `ember`, age 9-12, **5-day streak**, ~level 5.
- **Roo** — sci-fi / `nebula`, age 5-8, **3-day streak**, ~level 3.
- **12 quests** across every recurrence type (5 daily, 4 weekly, 1 monthly, 2 once),
  mixing required/optional and approval/auto-approve.
- **5 loot items** (unlimited + finite stock).
- **1 pending redemption** (Pip → "Pick the movie tonight", 75g held).
- **1 proposed wishlist item** (Roo → "Trip to the trampoline park").

## Prerequisite

Sign up as a parent and create a guild **in the app first**. That creates the
auth user + guild + owner NPC the script attaches to. With no guild yet, the
script prints a notice and changes nothing.

## Run it / reset to demo state

`demo.sql` **owns its target guild's content**: every run first deletes all
adventurers, quests, and loot in the **oldest** guild (cascading away their
completions, redemptions, wishlist, and ledger) and rebuilds from scratch.
So **re-running == reset to demo state**.

Because it replaces the guild's entire content, run it **only against a
dedicated demo account**. It targets the oldest guild (rather than creating a
new one) so the data lands in the guild the app already displays for that
parent — i.e. it actually shows up on screen and in screenshots.

### Local stack

```bash
docker exec -i supabase_db_lootlyfe psql -U postgres -d postgres < supabase/seeds/demo.sql
```

### Remote backend (staging / the TestFlight backend)

Open the project's **SQL editor** in the Supabase dashboard, paste the contents
of `demo.sql`, and run. (Push notifications stay a no-op during the seed unless
`private.push_config` is populated, so the bulk insert never tries to deliver.)

## Verifying without persisting

To dry-run against the live local DB and leave **no trace**, wrap a throwaway
parent fixture + the seed + assertions in a single transaction and `rollback`
at the end. This is how the seed was validated (Pip 178g / L5 / streak 5,
Roo 145g / L3 / streak 3, redemption stamped to 75g, all rolled back).
