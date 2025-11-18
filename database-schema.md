# therapist_profiles table
therapist_profiles (
  user_id uuid not null default gen_random_uuid (),
  full_name text null,
  title text null,
  bio text null,
  image_url text null,
  specialties jsonb null,
  is_live boolean not null,
  created_at date null,
  email text null,
  constraint therapist_profiles_pkey primary key (user_id),
  constraint therapist_profiles_user_id_fkey foreign KEY (user_id) references auth.users (id) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

# Authentication Users table
