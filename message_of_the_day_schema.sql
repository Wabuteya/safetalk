-- Create message_of_the_day table
CREATE TABLE IF NOT EXISTS message_of_the_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_date DATE NOT NULL UNIQUE,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Create index on message_date for fast lookups
CREATE INDEX IF NOT EXISTS idx_message_of_the_day_date ON message_of_the_day(message_date DESC);

-- Disable RLS for now (or configure appropriate policies)
ALTER TABLE message_of_the_day DISABLE ROW LEVEL SECURITY;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_message_of_the_day_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_message_of_the_day_updated_at ON message_of_the_day;
CREATE TRIGGER update_message_of_the_day_updated_at
  BEFORE UPDATE ON message_of_the_day
  FOR EACH ROW
  EXECUTE FUNCTION update_message_of_the_day_updated_at();

-- Insert seed messages for the next 30 days
-- You can run this to populate initial messages
INSERT INTO message_of_the_day (message_date, message_text) VALUES
  (CURRENT_DATE, 'You don''t have to have everything figured out today. One step is enough.'),
  (CURRENT_DATE + INTERVAL '1 day', 'It''s okay to pause. Rest is part of progress.'),
  (CURRENT_DATE + INTERVAL '2 days', 'You''re allowed to ask for help. You don''t have to do this alone.'),
  (CURRENT_DATE + INTERVAL '3 days', 'Some days are heavy — that doesn''t mean you''re failing.'),
  (CURRENT_DATE + INTERVAL '4 days', 'Your feelings are valid, even when they''re hard to explain.'),
  (CURRENT_DATE + INTERVAL '5 days', 'Showing up today is already an achievement.'),
  (CURRENT_DATE + INTERVAL '6 days', 'You are more than your deadlines and grades.'),
  (CURRENT_DATE + INTERVAL '7 days', 'It''s okay to take things one moment at a time.'),
  (CURRENT_DATE + INTERVAL '8 days', 'Progress doesn''t always look like motivation — sometimes it looks like patience.'),
  (CURRENT_DATE + INTERVAL '9 days', 'You deserve care, understanding, and time.'),
  (CURRENT_DATE + INTERVAL '10 days', 'Not every day has to be productive to be meaningful.'),
  (CURRENT_DATE + INTERVAL '11 days', 'You are allowed to protect your peace.'),
  (CURRENT_DATE + INTERVAL '12 days', 'Reaching out is a sign of strength, not weakness.'),
  (CURRENT_DATE + INTERVAL '13 days', 'It''s okay if today feels different from yesterday.'),
  (CURRENT_DATE + INTERVAL '14 days', 'You are learning, growing, and becoming — even on slow days.'),
  (CURRENT_DATE + INTERVAL '15 days', 'You don''t need all the answers right now.'),
  (CURRENT_DATE + INTERVAL '16 days', 'Your journey is your own. Take it at your pace.'),
  (CURRENT_DATE + INTERVAL '17 days', 'It''s okay to take a break without feeling guilty.'),
  (CURRENT_DATE + INTERVAL '18 days', 'You matter, even on days when it doesn''t feel like it.'),
  (CURRENT_DATE + INTERVAL '19 days', 'Small steps forward still count.'),
  (CURRENT_DATE + INTERVAL '20 days', 'You don''t have to have everything figured out today. One step is enough.'),
  (CURRENT_DATE + INTERVAL '21 days', 'It''s okay to pause. Rest is part of progress.'),
  (CURRENT_DATE + INTERVAL '22 days', 'You''re allowed to ask for help. You don''t have to do this alone.'),
  (CURRENT_DATE + INTERVAL '23 days', 'Some days are heavy — that doesn''t mean you''re failing.'),
  (CURRENT_DATE + INTERVAL '24 days', 'Your feelings are valid, even when they''re hard to explain.'),
  (CURRENT_DATE + INTERVAL '25 days', 'Showing up today is already an achievement.'),
  (CURRENT_DATE + INTERVAL '26 days', 'You are more than your deadlines and grades.'),
  (CURRENT_DATE + INTERVAL '27 days', 'It''s okay to take things one moment at a time.'),
  (CURRENT_DATE + INTERVAL '28 days', 'Progress doesn''t always look like motivation — sometimes it looks like patience.'),
  (CURRENT_DATE + INTERVAL '29 days', 'You deserve care, understanding, and time.')
ON CONFLICT (message_date) DO NOTHING;

