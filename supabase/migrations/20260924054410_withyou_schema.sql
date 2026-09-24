/*
# WithYou - Smartwatch Companion Schema

Creates 5 tables for the WithYou app and seeds them with the app's default data.
This is a single-tenant app (no sign-in) so all policies allow anon+authenticated access.

1. New Tables
- `family_contacts` — family member contacts with name, relation, phone, color, initials, online status
- `messages` — messages from family members with sender, text, time, unread status
- `medicines` — medicine reminders with name, dose, time, period, taken status
- `notifications` — notification cards with icon, title, text, time, color
- `dashboard_members` — family dashboard members with name, initials, color, detail, status

2. Security
- RLS enabled on all tables
- All policies TO anon, authenticated (no-auth single-tenant app)
- Full CRUD allowed on all tables

3. Seeding
- Each table seeded with the exact data from the app's hardcoded data.js
*/

-- Family contacts
CREATE TABLE IF NOT EXISTS family_contacts (
  id integer PRIMARY KEY,
  name text NOT NULL,
  relation_key text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL,
  online boolean NOT NULL DEFAULT true,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_family_contacts" ON family_contacts;
CREATE POLICY "anon_select_family_contacts" ON family_contacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_family_contacts" ON family_contacts;
CREATE POLICY "anon_insert_family_contacts" ON family_contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_family_contacts" ON family_contacts;
CREATE POLICY "anon_update_family_contacts" ON family_contacts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_family_contacts" ON family_contacts;
CREATE POLICY "anon_delete_family_contacts" ON family_contacts FOR DELETE TO anon, authenticated USING (true);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id integer PRIMARY KEY,
  sender text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL,
  text text NOT NULL,
  time text NOT NULL,
  unread boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE TO anon, authenticated USING (true);

-- Medicines
CREATE TABLE IF NOT EXISTS medicines (
  id integer PRIMARY KEY,
  name text NOT NULL,
  dose text NOT NULL,
  time text NOT NULL,
  period text NOT NULL,
  taken boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_medicines" ON medicines;
CREATE POLICY "anon_select_medicines" ON medicines FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_medicines" ON medicines;
CREATE POLICY "anon_insert_medicines" ON medicines FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_medicines" ON medicines;
CREATE POLICY "anon_update_medicines" ON medicines FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_medicines" ON medicines;
CREATE POLICY "anon_delete_medicines" ON medicines FOR DELETE TO anon, authenticated USING (true);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id integer PRIMARY KEY,
  icon text NOT NULL,
  color text NOT NULL,
  title text NOT NULL,
  text text NOT NULL,
  time text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_notifications" ON notifications;
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notifications" ON notifications;
CREATE POLICY "anon_insert_notifications" ON notifications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notifications" ON notifications;
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notifications" ON notifications;
CREATE POLICY "anon_delete_notifications" ON notifications FOR DELETE TO anon, authenticated USING (true);

-- Dashboard members
CREATE TABLE IF NOT EXISTS dashboard_members (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL,
  initials text NOT NULL,
  color text NOT NULL,
  detail text NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_dashboard_members" ON dashboard_members;
CREATE POLICY "anon_select_dashboard_members" ON dashboard_members FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dashboard_members" ON dashboard_members;
CREATE POLICY "anon_insert_dashboard_members" ON dashboard_members FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dashboard_members" ON dashboard_members;
CREATE POLICY "anon_update_dashboard_members" ON dashboard_members FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dashboard_members" ON dashboard_members;
CREATE POLICY "anon_delete_dashboard_members" ON dashboard_members FOR DELETE TO anon, authenticated USING (true);

-- Seed data
INSERT INTO family_contacts (id, name, relation_key, initials, color, online, phone) VALUES
  (1, 'Rahul Sharma', 'Son', 'RS', '#6fa8d6', true, '+91 98765 43210'),
  (2, 'Priya Sharma', 'Daughter', 'PS', '#7bc4a4', true, '+91 98123 45678'),
  (3, 'Anita Sharma', 'Wife', 'AS', '#e8b88f', false, '+91 99000 11223'),
  (4, 'Dr. Mehra', 'Doctor', 'DM', '#4a90a4', true, '+91 90000 44556')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, sender, initials, color, text, time, unread) VALUES
  (1, 'Rahul Sharma', 'RS', '#6fa8d6', 'Hi Papa, just checking in. Are you feeling okay today?', '2 min ago', true),
  (2, 'Priya Sharma', 'PS', '#7bc4a4', 'Sent you a photo of the kids! Look at how big they are getting.', '15 min ago', true),
  (3, 'Rahul Sharma', 'RS', '#6fa8d6', 'Remember to take your 2pm medicine, Papa.', '1 hr ago', false),
  (4, 'Dr. Mehra', 'DM', '#4a90a4', 'Your test results look good. Keep up the daily walks!', '3 hr ago', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO medicines (id, name, dose, time, period, taken) VALUES
  (1, 'Blood Pressure', '1 tablet', '8:00 AM', 'morning', true),
  (2, 'Vitamin D', '1 capsule', '1:00 PM', 'afternoon', false),
  (3, 'Diabetes', '1 tablet', '8:00 PM', 'evening', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO notifications (id, icon, color, title, text, time) VALUES
  (1, 'bi-chat-heart', '#6fa8d6', 'New Message', 'Rahul: Hi Papa, just checking in...', '2 min ago'),
  (2, 'bi-capsule', '#e8b88f', 'Medicine Reminder', 'Time to take Vitamin D (1:00 PM)', '5 min ago'),
  (3, 'bi-heart-pulse', '#7bc4a4', 'Check-in Sent', 'Family was notified you are OK', '1 hr ago'),
  (4, 'bi-bell', '#4a90a4', 'Appointment', 'Dr. Mehra tomorrow at 10:30 AM', '2 hr ago')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dashboard_members (name, initials, color, detail, status) VALUES
  ('Rahul', 'RS', '#6fa8d6', 'Last check-in: 2 hr ago', 'ok'),
  ('Priya', 'PS', '#7bc4a4', 'Last check-in: 5 hr ago', 'ok'),
  ('Anita', 'AS', '#e8b88f', 'Last check-in: 1 day ago', 'warn')
ON CONFLICT DO NOTHING;