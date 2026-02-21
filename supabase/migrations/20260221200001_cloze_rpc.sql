-- RPC function to increment used_count for cloze items in bulk
-- Called from the frontend after fetching items for a session

create or replace function increment_cloze_used_count(item_ids uuid[])
returns void
language plpgsql
security definer
as $$
begin
  update cloze_items
  set used_count = used_count + 1
  where id = any(item_ids);
end;
$$;

-- Grant execute to authenticated users
grant execute on function increment_cloze_used_count(uuid[]) to authenticated;
