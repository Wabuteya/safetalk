-- Add account status field to student_profiles table
-- This enables account management actions (Suspend, Reactivate, Deactivate)

ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' 
CHECK (account_status IN ('active', 'suspended', 'deactivated'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_status 
ON student_profiles(account_status);

-- Optional: Add last_login tracking
-- Uncomment the following if you want to track last login times
-- ALTER TABLE student_profiles 
-- ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
-- 
-- CREATE INDEX IF NOT EXISTS idx_student_profiles_last_login 
-- ON student_profiles(last_login DESC);

-- Update existing records to have 'active' status (if they don't have one)
UPDATE student_profiles 
SET account_status = 'active' 
WHERE account_status IS NULL;

