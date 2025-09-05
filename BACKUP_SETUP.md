# Supabase Backup System Setup Guide

## 🚀 Quick Setup

### 1. Database Schema Setup
1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `enhanced-schema.sql`
4. Click "Run" to create all the backup tables

### 2. Environment Variables
Make sure your `.env.local` file has:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Test the System
1. Start your development server: `npm run dev`
2. Upload a CSV file
3. Create a new backup session
4. Generate a plan
5. Check that auto-save is working (every 30 seconds)

## 🔧 Features

### ✅ What's Backed Up Automatically:
- **Product Data**: All uploaded CSV data
- **Generated Plans**: Daily, weekly, monthly plans
- **Ad-hoc Analysis**: All product analysis and approved products
- **Settings**: Category selections, configurations, preferences
- **Session Management**: Multiple named sessions

### 🎛️ Backup Controls:
- **Auto-save Toggle**: Enable/disable automatic saving (every 30 seconds)
- **Save Now**: Manual save button
- **New Session**: Create a new backup session
- **Load Session**: Restore any previous session
- **Manage**: View all sessions and delete old ones

### 📊 Session Management:
- **Named Sessions**: Give each session a descriptive name
- **Timestamps**: See when sessions were created and last updated
- **Active Session**: One session is always active for auto-save
- **Cross-Device**: Access your work from any device

## 🛡️ Data Safety

### Never Lose Your Work Again:
- ✅ Auto-saves every 30 seconds
- ✅ Manual save on demand
- ✅ Multiple session support
- ✅ Cross-device synchronization
- ✅ Complete state restoration

### What Happens If:
- **Browser crashes**: Your work is automatically saved
- **Accidentally close tab**: Just reload and select your session
- **Switch devices**: Log in and load your session
- **Power outage**: Last auto-save is preserved

## 🔄 How It Works

1. **Auto-save**: Every 30 seconds, all your data is saved to Supabase
2. **Manual Save**: Click "Save Now" to save immediately
3. **Session Creation**: Create named sessions for different projects
4. **Session Loading**: Restore any previous session with one click
5. **Cross-Device**: Your data syncs across all devices

## 🚨 Important Notes

- **File Uploads**: The actual CSV file can't be restored (only the processed data)
- **Browser Storage**: Auto-save uses Supabase, not localStorage
- **Session Limits**: No limits on number of sessions (within Supabase limits)
- **Data Retention**: Sessions are kept until manually deleted

## 🆘 Troubleshooting

### Auto-save Not Working:
1. Check that auto-save toggle is enabled
2. Verify you have an active session
3. Check browser console for errors
4. Ensure Supabase connection is working

### Can't Load Sessions:
1. Check Supabase connection
2. Verify database schema is set up correctly
3. Check browser console for errors
4. Try refreshing the page

### Data Not Syncing:
1. Check internet connection
2. Verify Supabase credentials
3. Check if Supabase service is running
4. Look for error messages in console

## 🎉 You're All Set!

Your Promotion Planner now has enterprise-grade backup capabilities. Never lose your work again!
