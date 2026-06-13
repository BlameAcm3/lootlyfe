-- Loot economy: the redemption gold-hold + refund path, stock decrement on
-- approval, and the wishlist accept → live loot item RPC. Completes the loot
-- feature whose schema (006), RLS (007), and achievement detection (014)
-- already exist.
--
-- Design:
-- * The kid device inserts a loot_redemptions row (RLS-checked, status
--   'pending') exactly the way it inserts a quest_completion. A BEFORE INSERT
--   trigger stamps gold_spent from the loot's authoritative gold_cost — the
--   client-sent value is display-only, never trusted — and refuses a sold-out
--   item. An AFTER INSERT trigger debits the ledger immediately, so gold is
--   "held" the moment the request lands. The ledger-apply trigger's
--   gold_balance >= 0 check (006) makes an overdraw roll the whole insert
--   back: no negative balances, and no client-side balance math anywhere.
-- * Only pending → approved | rejected transitions are allowed; a resolved
--   redemption is immutable (mirrors approved completions in 013). Approval
--   decrements finite stock under a row lock; denial refunds the held gold.
--   Both ledger writes are idempotent on (source_type, source_id), so a
--   replayed status update can never double-spend or double-refund.
-- * Stock decrements ON APPROVAL (per spec), not at request time. Two pending
--   requests against the last unit is the documented oversell race: the first
--   approval takes stock to 0, the second raises 'loot_sold_out' and the NPC
--   denies it instead (which auto-refunds the held gold).

-- ---------------------------------------------------------------------------
-- Request: stamp the authoritative cost and gate sold-out items.
-- ---------------------------------------------------------------------------

create or replace function public.handle_redemption_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loot public.loot_items%rowtype;
begin
  select * into v_loot from public.loot_items where id = new.loot_id;
  if not found then
    raise exception 'loot_not_found';
  end if;
  -- Sold out (finite stock at zero) can't be requested. The shop disables the
  -- tile too; this is the server backstop against a stale client.
  if v_loot.stock is not null and v_loot.stock <= 0 then
    raise exception 'loot_sold_out';
  end if;
  -- gold_spent is authoritative: the held amount is always the live cost.
  new.gold_spent := v_loot.gold_cost;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Settlement: hold gold on request, decrement stock on approval, refund on
-- denial. All ledger writes idempotent; resolved redemptions immutable.
-- ---------------------------------------------------------------------------

create or replace function public.handle_redemption_settlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stock integer;
begin
  if tg_op = 'INSERT' then
    -- Hold the gold immediately (the ledger-apply trigger's non-negative
    -- balance check rolls the whole insert back on an overdraw). A redemption
    -- seeded directly as 'approved' still debits; only a rejected seed skips.
    if new.status <> 'rejected' then
      insert into public.gold_xp_ledger
          (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
        values (new.adventurer_id, -new.gold_spent, 0, 0, 'loot_redemption', new.id)
        on conflict (source_type, source_id) do nothing;
    end if;
    return new;
  end if;

  -- UPDATE: a resolved redemption is immutable; only pending may transition.
  if old.status <> 'pending' and new.status is distinct from old.status then
    raise exception 'redemption already resolved';
  end if;
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'approved' then
    -- Decrement finite stock under a row lock (serializes concurrent grants
    -- for the same loot). Unlimited stock (null) is left untouched.
    select stock into v_stock from public.loot_items where id = new.loot_id for update;
    if v_stock is not null then
      if v_stock <= 0 then
        raise exception 'loot_sold_out';
      end if;
      update public.loot_items set stock = v_stock - 1 where id = new.loot_id;
    end if;
  elsif new.status = 'rejected' then
    -- Refund the held gold (one refund per redemption, ever).
    insert into public.gold_xp_ledger
        (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
      values (new.adventurer_id, new.gold_spent, 0, 0, 'loot_refund', new.id)
      on conflict (source_type, source_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger loot_redemptions_stamp
  before insert on public.loot_redemptions
  for each row
  execute function public.handle_redemption_stamp();

-- AFTER, so the debit/refund land once the row (and its RLS check) hold. Runs
-- after loot_redemptions_award (alphabetical) — order is immaterial, the award
-- counter reads committed-in-txn rows and a sold-out raise rolls back both.
create trigger loot_redemptions_settle
  after insert or update of status on public.loot_redemptions
  for each row
  execute function public.handle_redemption_settlement();

-- ---------------------------------------------------------------------------
-- Wishlist accept → live loot item. One transaction: create the loot_items
-- row in the proposing adventurer's guild and mark the wish accepted. The NPC
-- may adjust the cost (and optionally set stock) when accepting. Decline is a
-- plain status update under the existing loot_wishlist NPC policy (007).
-- ---------------------------------------------------------------------------

create or replace function public.accept_wishlist_item(
  p_wishlist_id uuid,
  p_gold_cost integer,
  p_stock integer default null  -- null = unlimited stock
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wish public.loot_wishlist%rowtype;
  v_guild_id uuid;
  v_npc_id uuid;
  v_loot_id uuid;
begin
  select * into v_wish from public.loot_wishlist where id = p_wishlist_id;
  if not found then
    raise exception 'wishlist item not found';
  end if;
  if v_wish.status <> 'proposed' then
    raise exception 'wishlist item already resolved';
  end if;
  if p_gold_cost is null or p_gold_cost < 0 then
    raise exception 'invalid gold cost';
  end if;
  if p_stock is not null and p_stock < 0 then
    raise exception 'invalid stock';
  end if;

  v_guild_id := public.adventurer_guild_id(v_wish.adventurer_id);
  if not public.is_guild_npc(v_guild_id) then
    raise exception 'not authorized';
  end if;

  select id into v_npc_id
    from public.npc_profiles
    where user_id = auth.uid() and guild_id = v_guild_id
    limit 1;
  if v_npc_id is null then
    raise exception 'npc profile not found';
  end if;

  insert into public.loot_items (guild_id, name, description, gold_cost, stock, created_by_npc_id)
    values (v_guild_id, v_wish.name, v_wish.description, p_gold_cost, p_stock, v_npc_id)
    returning id into v_loot_id;

  update public.loot_wishlist set status = 'accepted' where id = p_wishlist_id;

  return v_loot_id;
end;
$$;

grant execute on function public.accept_wishlist_item(uuid, integer, integer) to authenticated;
