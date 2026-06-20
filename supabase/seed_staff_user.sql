-- After creating a user in Supabase Auth (Dashboard > Authentication > Users > Add user,
-- or via supabase.auth.admin.createUser from a trusted script), link them as staff here.
-- Replace the UUID and name below with the real values.

insert into staff_users (id, full_name, role)
values (
  'PASTE_AUTH_USER_UUID_HERE',
  'Jinx',
  'admin'
)
on conflict (id) do update set full_name = excluded.full_name, role = excluded.role;
