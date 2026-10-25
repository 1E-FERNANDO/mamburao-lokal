create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon text not null default 'services',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  category_id uuid not null references public.categories (id),
  description text not null check (char_length(description) between 10 and 1000),
  address text not null check (char_length(address) between 3 and 250),
  phone text check (phone is null or char_length(phone) <= 40),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  operating_hours text check (operating_hours is null or char_length(operating_hours) <= 250),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 10 and 1000),
  address text not null check (char_length(address) between 3 and 250),
  location text,
  phone text check (phone is null or char_length(phone) <= 40),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  operating_hours text check (operating_hours is null or char_length(operating_hours) <= 250),
  cover_image_path text,
  is_featured boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 5 and 1000),
  price numeric(12, 2) not null check (price >= 0),
  image_path text,
  available boolean not null default true,
  is_featured boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_public_category_idx on public.businesses (category_id, name) where status = 'approved';
create index products_public_category_idx on public.products (category_id, created_at desc) where status = 'approved' and available;
create index seller_applications_review_idx on public.seller_applications (created_at) where status = 'pending';
create unique index seller_applications_one_pending_per_owner_idx on public.seller_applications (owner_id) where status = 'pending';

insert into public.categories (name, slug, icon) values
  ('Food and Restaurants', 'food', 'food'),
  ('Grocery and Convenience Stores', 'grocery', 'grocery'),
  ('Clothing and Fashion', 'fashion', 'fashion'),
  ('Pasalubong and Local Products', 'pasalubong', 'pasalubong'),
  ('Accommodation', 'accommodation', 'accommodation'),
  ('Tourism and Travel Services', 'tourism', 'tourism'),
  ('Beauty and Personal Care', 'beauty', 'beauty'),
  ('Electronics and Gadgets', 'electronics', 'electronics'),
  ('Home and General Merchandise', 'home', 'home'),
  ('Other Local Services', 'services', 'services');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.review_seller_application(application_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.seller_applications%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;

  update public.seller_applications
  set status = case when approve then 'approved' else 'rejected' end
  where id = application_id and status = 'pending'
  returning * into application_row;

  if application_row.id is null then
    raise exception 'Pending seller application not found';
  end if;

  update public.profiles
  set role = case when approve then 'seller' else 'buyer' end
  where id = application_row.owner_id;

  if approve then
    insert into public.businesses (
      owner_id, category_id, name, description, address, phone, contact_email, operating_hours, status
    ) values (
      application_row.owner_id,
      application_row.category_id,
      application_row.business_name,
      application_row.description,
      application_row.address,
      application_row.phone,
      application_row.contact_email,
      application_row.operating_hours,
      'approved'
    );
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.seller_applications enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;

create policy "Users read own profile or administrators read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "Users update own profile fields"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Public read active categories"
  on public.categories for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "Administrators insert categories"
  on public.categories for insert to authenticated
  with check (public.is_admin());
create policy "Administrators update categories"
  on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Administrators delete categories"
  on public.categories for delete to authenticated
  using (public.is_admin());

create policy "Applicants create own application"
  on public.seller_applications for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'buyer')
    and exists (select 1 from public.categories where id = category_id and is_active)
  );
create policy "Users read own applications and administrators read all"
  on public.seller_applications for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());
create policy "Administrators manage applications"
  on public.seller_applications for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "Public reads approved businesses"
  on public.businesses for select to anon, authenticated
  using (
    (
      status = 'approved'
      and exists (select 1 from public.categories where id = category_id and is_active)
    )
    or owner_id = (select auth.uid())
    or public.is_admin()
  );
create policy "Sellers create pending businesses"
  on public.businesses for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and not is_featured
    and exists (select 1 from public.categories where id = category_id and is_active)
    and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'seller')
  );
create policy "Owners edit and resubmit businesses"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (
    public.is_admin()
    or (
      owner_id = (select auth.uid())
      and status = 'pending'
      and not is_featured
      and exists (select 1 from public.categories where id = category_id and is_active)
    )
  );
create policy "Owners remove pending businesses and administrators manage businesses"
  on public.businesses for delete to authenticated
  using (public.is_admin() or (owner_id = (select auth.uid()) and status = 'pending'));

create policy "Public reads approved available products for approved businesses"
  on public.products for select to anon, authenticated
  using (
    (
      status = 'approved'
      and exists (select 1 from public.categories where id = category_id and is_active)
      and exists (select 1 from public.businesses where id = business_id and status = 'approved')
    )
    or exists (select 1 from public.businesses where id = business_id and owner_id = (select auth.uid()))
    or public.is_admin()
  );
create policy "Sellers create pending products for their approved businesses"
  on public.products for insert to authenticated
  with check (
    status = 'pending'
    and not is_featured
    and exists (select 1 from public.categories where id = category_id and is_active)
    and exists (
      select 1 from public.businesses
      where id = business_id and owner_id = (select auth.uid()) and status = 'approved'
    )
  );
create policy "Owners resubmit products and administrators manage products"
  on public.products for update to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.businesses where id = business_id and owner_id = (select auth.uid()))
  )
  with check (
    public.is_admin()
    or (
      status = 'pending'
      and not is_featured
      and exists (select 1 from public.categories where id = category_id and is_active)
      and exists (select 1 from public.businesses where id = business_id and owner_id = (select auth.uid()))
    )
  );
create policy "Owners remove pending products and administrators manage products"
  on public.products for delete to authenticated
  using (
    public.is_admin()
    or (
      status = 'pending'
      and exists (select 1 from public.businesses where id = business_id and owner_id = (select auth.uid()))
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Owners upload images to their business folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and exists (
      select 1 from public.businesses
      where id::text = (storage.foldername(name))[1]
        and owner_id = (select auth.uid())
    )
  );
create policy "Approved listing images are readable"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'business-media'
    and exists (
      select 1 from public.businesses
      where id::text = (storage.foldername(name))[1] and status = 'approved'
    )
    and (
      (storage.foldername(name))[2] is null
      or exists (
        select 1 from public.products
          where id::text = (storage.foldername(name))[2]
            and business_id::text = (storage.foldername(name))[1]
            and status = 'approved'
      )
    )
  );
create policy "Owners remove images from their business folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-media'
    and exists (
      select 1 from public.businesses
      where id::text = (storage.foldername(name))[1] and owner_id = (select auth.uid())
    )
  );

grant select on public.categories, public.businesses, public.products to anon, authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert on public.seller_applications to authenticated;
grant update on public.seller_applications to authenticated;
grant select, insert, update, delete on public.businesses, public.products to authenticated;
grant select, update (full_name) on public.profiles to authenticated;
grant execute on function public.review_seller_application(uuid, boolean) to authenticated;

create or replace function public.set_marketplace_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;
  if new_role not in ('buyer', 'seller') then
    raise exception 'Role must be buyer or seller';
  end if;
  update public.profiles set role = new_role where id = target_user_id;
  if not found then
    raise exception 'Account not found';
  end if;
end;
$$;

grant execute on function public.set_marketplace_user_role(uuid, text) to authenticated;
