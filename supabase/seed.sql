-- No demo seed. The legacy family demo data was removed with the family
-- schema (011). When guild-domain demo content is wanted for local dev, seed
-- it here (guilds -> npc_profiles -> adventurer_profiles -> quests -> ...)
-- guarded the same way the old seed was: skip with a notice when no auth
-- user exists yet.
do $$
begin
  raise notice 'seed: no demo data defined for the guild schema yet.';
end;
$$;
