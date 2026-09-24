/*
# WithYou - Message Replies Table

Stores replies sent by the user (Arjun) to individual messages.
Each reply belongs to a message and is displayed in that message's thread view.
*/

CREATE TABLE IF NOT EXISTS message_replies (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id integer NOT NULL,
  sender text NOT NULL DEFAULT 'Arjun',
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE message_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_select_message_replies" ON message_replies;
CREATE POLICY "anon_select_message_replies" ON message_replies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_message_replies" ON message_replies;
CREATE POLICY "anon_insert_message_replies" ON message_replies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_message_replies" ON message_replies;
CREATE POLICY "anon_update_message_replies" ON message_replies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_message_replies" ON message_replies;
CREATE POLICY "anon_delete_message_replies" ON message_replies FOR DELETE TO anon, authenticated USING (true);