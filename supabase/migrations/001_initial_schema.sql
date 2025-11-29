-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS vm_users CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS instances CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create instances table with user_id
CREATE TABLE instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  os TEXT NOT NULL,
  cpu INT NOT NULL,
  ram INT NOT NULL,
  storage INT NOT NULL,
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'stopped' CHECK (status IN ('running', 'stopped')),
  script_status TEXT NOT NULL DEFAULT 'pending' CHECK (script_status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  script_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'installed',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vm_users table
CREATE TABLE vm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  sudo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_services_instance_id ON services(instance_id);
CREATE INDEX idx_vm_users_instance_id ON vm_users(instance_id);
CREATE INDEX idx_instances_status ON instances(status);
CREATE INDEX idx_instances_user_id ON instances(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vm_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own instances" ON instances;
DROP POLICY IF EXISTS "Users can create their own instances" ON instances;
DROP POLICY IF EXISTS "Users can update their own instances" ON instances;
DROP POLICY IF EXISTS "Users can delete their own instances" ON instances;
DROP POLICY IF EXISTS "Users can view services of their instances" ON services;
DROP POLICY IF EXISTS "Users can create services for their instances" ON services;
DROP POLICY IF EXISTS "Users can update services of their instances" ON services;
DROP POLICY IF EXISTS "Users can delete services of their instances" ON services;
DROP POLICY IF EXISTS "Users can view users of their instances" ON vm_users;
DROP POLICY IF EXISTS "Users can create users for their instances" ON vm_users;
DROP POLICY IF EXISTS "Users can update users of their instances" ON vm_users;
DROP POLICY IF EXISTS "Users can delete users of their instances" ON vm_users;

-- Create policies for user-based access on instances
CREATE POLICY "Users can view their own instances" ON instances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own instances" ON instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own instances" ON instances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own instances" ON instances
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for services
CREATE POLICY "Users can view services of their instances" ON services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = services.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create services for their instances" ON services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = services.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update services of their instances" ON services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = services.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete services of their instances" ON services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = services.instance_id
      AND instances.user_id = auth.uid()
    )
  );

-- Create policies for vm_users
CREATE POLICY "Users can view users of their instances" ON vm_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = vm_users.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create users for their instances" ON vm_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = vm_users.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update users of their instances" ON vm_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = vm_users.instance_id
      AND instances.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete users of their instances" ON vm_users
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM instances
      WHERE instances.id = vm_users.instance_id
      AND instances.user_id = auth.uid()
    )
  );
