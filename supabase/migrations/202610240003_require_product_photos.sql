update public.products as product
set status = 'pending',
    is_featured = false
where product.status = 'approved'
  and (
    product.image_path is null
    or not exists (
      select 1
      from storage.objects as image
      where image.bucket_id = 'business-media'
        and image.name = product.image_path
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and conname = 'approved_products_require_photo'
  ) then
    alter table public.products
      add constraint approved_products_require_photo
      check (status <> 'approved' or image_path is not null);
  end if;
end;
$$;

create or replace function public.require_uploaded_photo_for_approved_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' then
    if new.image_path is null then
      raise exception 'A product photo is required before a listing can be approved';
    end if;

    if new.image_path not like new.business_id::text || '/' || new.id::text || '/%' then
      raise exception 'The product photo must be stored in this product listing folder';
    end if;

    if not exists (
      select 1
      from storage.objects as image
      where image.bucket_id = 'business-media'
        and image.name = new.image_path
    ) then
      raise exception 'The uploaded product photo could not be found';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists products_require_uploaded_photo on public.products;

create trigger products_require_uploaded_photo
  before insert or update of status, image_path, business_id
  on public.products
  for each row
  execute function public.require_uploaded_photo_for_approved_product();

drop policy if exists "Approved listing images are readable" on storage.objects;

create policy "Approved listing images are readable"
  on storage.objects for select to anon, authenticated
  using (
    storage.objects.bucket_id = 'business-media'
    and (
      (
        public.is_admin()
        and exists (
          select 1
          from public.products as product
          where product.image_path = storage.objects.name
            and product.business_id::text = (storage.foldername(storage.objects.name))[1]
        )
      )
      or exists (
        select 1
        from public.businesses as business
        where business.id::text = (storage.foldername(storage.objects.name))[1]
          and business.status = 'approved'
        and business.cover_image_path = storage.objects.name
      )
      or exists (
        select 1
        from public.products as product
        join public.businesses as business on business.id = product.business_id
        where product.image_path = storage.objects.name
          and product.business_id::text = (storage.foldername(storage.objects.name))[1]
          and product.status = 'approved'
          and business.status = 'approved'
      )
    )
  );
