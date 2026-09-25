-- Store voice-message URLs alongside text replies.
ALTER TABLE message_replies
  ADD COLUMN IF NOT EXISTS audio_url text;

-- Public read access is needed so the watch audio player can stream the file.
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public_read_voice_messages" ON storage.objects;
CREATE POLICY "public_read_voice_messages"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'voice-messages');

DROP POLICY IF EXISTS "anon_upload_voice_messages" ON storage.objects;
CREATE POLICY "anon_upload_voice_messages"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'voice-messages');
