# Update Guide - Removed Edge Functions

This guide explains the changes made to remove Supabase Edge Functions and implement direct script execution with authentication.

## Changes Made

### 1. Database Schema Updates

- Added `user_id` column to `instances` table
- Changed unique constraint from `name` to `(user_id, name)` - allows same name for different users
- Updated Row Level Security (RLS) policies to enforce user-based access
- All tables now properly filter by authenticated user

### 2. Authentication System

- Added login/signup page at `/auth/login`
- Added logout page at `/auth/logout`
- Created middleware to protect routes
- All pages now require authentication

### 3. Script Execution

- Created `lib/scripts/executor.ts` for direct script execution
- Scripts are now called directly from API routes (not via Edge Functions)
- Works on Windows (via Git Bash/WSL) and Unix systems

### 4. API Routes Updated

All API routes now:
- Check authentication before processing
- Filter data by `user_id` to ensure users only see their own servers
- Execute shell scripts directly using the executor utility
- No longer call Supabase Edge Functions

### 5. Frontend Updates

- Dashboard filters instances by current user
- Server details page filters by user ownership
- Navigation includes "Sign Out" link

## Setup Instructions

### 1. Update Database

Run the updated migration in your Supabase SQL Editor:

```sql
-- The migration file has been updated with user_id and RLS policies
-- Run: supabase/migrations/001_initial_schema.sql
```

### 2. Environment Variables

Your `.env.local` file should contain:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nxpjryvajodkybkmplqw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. No Edge Functions Needed

You can ignore/delete the Edge Functions folder. They are no longer used.

### 4. Script Execution

The scripts will execute directly on the machine running the Next.js server:
- **Windows**: Uses Git Bash or WSL (bash command)
- **Linux/macOS**: Executes directly

Make sure scripts are executable:
```bash
chmod +x scripts/*.sh
```

## How It Works Now

1. **User Authentication**: Users sign in/sign up via Supabase Auth
2. **Data Storage**: VM configurations stored in Supabase database (filtered by user_id)
3. **Script Execution**: When actions are performed, scripts run directly on the local machine
4. **Security**: RLS policies ensure users can only access their own data

## Benefits

- ✅ No need to deploy Edge Functions
- ✅ Direct control over VirtualBox on local machine
- ✅ Multi-user support with proper isolation
- ✅ Simpler architecture
- ✅ Faster execution (no network calls to Edge Functions)

## Testing

1. Sign up for a new account at `/auth/login`
2. Create a server - it will be associated with your user
3. Try creating another account - you won't see the first account's servers
4. Test script execution by starting/stopping a server

## Troubleshooting

### Scripts not executing on Windows

- Ensure Git Bash is installed and in PATH
- Or use WSL (Windows Subsystem for Linux)
- The executor will automatically use `bash` command on Windows

### Authentication errors

- Check that RLS policies are correctly set up
- Verify user is authenticated in browser console
- Check Supabase dashboard for auth settings

### Permission errors

- Ensure scripts are executable: `chmod +x scripts/*.sh`
- Check that VirtualBox is installed and VBoxManage is in PATH

