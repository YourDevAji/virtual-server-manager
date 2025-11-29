# Setup Guide

This guide will walk you through setting up the Virtual Server Manager from scratch.

## Step 1: Prerequisites

Install the following software:

1. **Node.js 20+**
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **VirtualBox**
   - Download from [virtualbox.org](https://www.virtualbox.org/)
   - Verify installation: `VBoxManage --version`

3. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com/)
   - Create a new project

4. **Git** (optional, for cloning)
   - Download from [git-scm.com](https://git-scm.com/)

## Step 2: Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd virtual-server-manager

# Install dependencies
npm install
```

## Step 3: Supabase Setup

### 3.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in project details:
   - Name: `virtual-server-manager`
   - Database Password: (save this securely)
   - Region: Choose closest to you
4. Wait for project to be created (2-3 minutes)

### 3.2 Run Database Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run" to execute the migration
5. Verify tables were created in **Table Editor**

### 3.3 Get API Credentials

1. Go to **Settings > API**
2. Copy the following:
   - **Project URL** (under "Project URL")
   - **anon/public key** (under "Project API keys")

## Step 4: Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Copy the example (if available) or create manually
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Deploy Supabase Edge Functions

### 5.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 5.2 Login to Supabase

```bash
supabase login
```

Follow the prompts to authenticate.

### 5.3 Link Your Project

```bash
# Get your project reference ID from Supabase Dashboard > Settings > General
supabase link --project-ref your-project-ref-id
```

### 5.4 Deploy Edge Functions

Deploy each function:

```bash
supabase functions deploy create-vm
supabase functions deploy start-vm
supabase functions deploy stop-vm
supabase functions deploy destroy-vm
supabase functions deploy install-service
supabase functions deploy add-user
```

### 5.5 Set Environment Variables (Optional)

If you have a webhook server for script execution:

1. Go to **Supabase Dashboard > Edge Functions**
2. For each function, add environment variable:
   - Key: `VM_SCRIPT_WEBHOOK_URL`
   - Value: `http://your-webhook-server:port/execute-script`

## Step 6: Configure Shell Scripts

### Linux/macOS

Make scripts executable:

```bash
chmod +x scripts/*.sh
```

### Windows

Use Git Bash or WSL to run the scripts. The scripts are bash scripts and require a Unix-like environment.

## Step 7: Verify VirtualBox

Test that VBoxManage works:

```bash
VBoxManage --version
```

You should see a version number. If not, ensure VirtualBox is installed and in your PATH.

## Step 8: Run the Application

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Step 9: Test the Application

1. **Create a Test Server**
   - Click "Create New Server"
   - Fill in the form:
     - Name: `test-server`
     - OS: Ubuntu
     - CPU: 2
     - RAM: 4 GB
     - Storage: 20 GB
   - Click "Create Server"

2. **View Dashboard**
   - You should see your server in the table
   - Status should be "stopped"

3. **Test Server Actions**
   - Click on the server name to view details
   - Try starting the server (if VirtualBox is configured)
   - Add a service
   - Add a user

## Troubleshooting

### "VBoxManage not found"

- Ensure VirtualBox is installed
- Add VirtualBox to your system PATH
- On Windows: Add `C:\Program Files\Oracle\VirtualBox` to PATH
- On macOS: Usually already in PATH if installed via Homebrew
- On Linux: Usually in `/usr/bin` or `/usr/local/bin`

### "Supabase connection error"

- Verify `.env.local` has correct credentials
- Check Supabase project is active (not paused)
- Verify Row Level Security policies allow operations

### "Edge Function not found"

- Ensure functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs <function-name>`
- Verify you're using the correct project reference

### "Script execution failed"

- Check script permissions: `ls -l scripts/*.sh`
- Verify scripts are executable: `chmod +x scripts/*.sh`
- Test script manually: `./scripts/create_vm.sh test-vm Ubuntu 2 4 20`
- Check VirtualBox is running

## Next Steps

- Configure a webhook server for script execution (optional)
- Set up authentication/authorization (if needed)
- Customize UI styling
- Add more services to the installation list
- Implement VM IP address detection

## Support

For issues or questions:
1. Check the main README.md
2. Review Supabase documentation
3. Check VirtualBox documentation
4. Open an issue on the repository

