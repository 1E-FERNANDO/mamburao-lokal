do $$
declare
  target_table_name text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'Supabase Realtime publication is missing; enable Realtime for this project first.';
  end if;

  foreach target_table_name in array array['categories', 'businesses', 'products', 'seller_applications', 'profiles']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table_name);
    end if;
  end loop;
end;
$$;
