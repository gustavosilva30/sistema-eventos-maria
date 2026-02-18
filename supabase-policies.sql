-- Complementar: Apenas políticas RLS (se as tabelas já existem)

-- Enable Row Level Security (RLS) policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON events;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON guests;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON reminders;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON users;

-- Allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON events
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON guests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON reminders
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all operations for authenticated users" ON users
    FOR ALL USING (auth.role() = 'authenticated');
