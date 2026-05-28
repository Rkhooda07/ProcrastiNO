create table if not exists public.profile_pictures (
  user_id uuid primary key,
  image_path text not null,
  image_url text not null,
  updated_at timestamptz not null default now(),
  constraint profile_pictures_known_users check (
    user_id in (
      '8b693895-7145-4202-8692-06992f7682f6'::uuid,
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
    )
  )
);

alter table public.profile_pictures enable row level security;

drop policy if exists "Anyone can read profile pictures" on public.profile_pictures;
create policy "Anyone can read profile pictures"
  on public.profile_pictures for select
  to anon
  using (true);

drop policy if exists "Known users can upsert profile pictures" on public.profile_pictures;
create policy "Known users can upsert profile pictures"
  on public.profile_pictures for insert
  to anon
  with check (
    user_id in (
      '8b693895-7145-4202-8692-06992f7682f6'::uuid,
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
    )
  );

drop policy if exists "Known users can update profile pictures" on public.profile_pictures;
create policy "Known users can update profile pictures"
  on public.profile_pictures for update
  to anon
  using (
    user_id in (
      '8b693895-7145-4202-8692-06992f7682f6'::uuid,
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
    )
  )
  with check (
    user_id in (
      '8b693895-7145-4202-8692-06992f7682f6'::uuid,
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
    )
  );

insert into storage.buckets (id, name, public)
values ('profile-pictures', 'profile-pictures', true)
on conflict (id) do update set public = true;

drop policy if exists "Anyone can read profile picture objects" on storage.objects;
create policy "Anyone can read profile picture objects"
  on storage.objects for select
  to anon
  using (bucket_id = 'profile-pictures');

drop policy if exists "Known users can upload profile picture objects" on storage.objects;
create policy "Known users can upload profile picture objects"
  on storage.objects for insert
  to anon
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] in (
      '8b693895-7145-4202-8692-06992f7682f6',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    )
  );

drop policy if exists "Known users can update profile picture objects" on storage.objects;
create policy "Known users can update profile picture objects"
  on storage.objects for update
  to anon
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] in (
      '8b693895-7145-4202-8692-06992f7682f6',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    )
  )
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] in (
      '8b693895-7145-4202-8692-06992f7682f6',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    )
  );

do $$
begin
  alter publication supabase_realtime add table public.profile_pictures;
exception
  when duplicate_object then null;
end $$;
