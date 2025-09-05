# 🚀 Vercel Deployment Guide

## Prerequisites
- [Vercel account](https://vercel.com) (free tier available)
- [Supabase project](https://supabase.com) (free tier available)
- Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Supabase Database

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Note down your project URL and anon key

### 1.2 Set Up Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `enhanced-schema.sql`
3. Paste and run the SQL to create all backup tables
4. Verify tables are created in the **Table Editor**

## Step 2: Deploy to Vercel

### 2.1 Push to Git Repository
```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Add comprehensive backup system with Supabase"

# Add remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/promotion-planner.git

# Push to repository
git push -u origin main
```

### 2.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js settings

### 2.3 Configure Environment Variables
In your Vercel project dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Click **Save** for each variable

### 2.4 Deploy
1. Click **Deploy** in Vercel
2. Wait for deployment to complete
3. Your app will be live at `https://your-project.vercel.app`

## Step 3: Test Your Deployment

### 3.1 Verify Backup System
1. Open your deployed app
2. Upload a CSV file
3. Create a new backup session
4. Generate a plan
5. Check that auto-save is working

### 3.2 Test Cross-Device Sync
1. Open the app on another device
2. Load your session
3. Verify data syncs correctly

## 🔧 Troubleshooting

### Build Errors
- Check that all dependencies are in `package.json`
- Verify TypeScript compilation passes locally
- Check Vercel build logs for specific errors

### Supabase Connection Issues
- Verify environment variables are set correctly
- Check Supabase project is active
- Ensure database schema is deployed

### Auto-save Not Working
- Check browser console for errors
- Verify Supabase connection
- Ensure database tables exist

## 📊 Monitoring

### Vercel Analytics
- View deployment status
- Monitor performance
- Check error logs

### Supabase Dashboard
- Monitor database usage
- View backup data
- Check API calls

## 🎉 You're Live!

Your Promotion Planner is now deployed with:
- ✅ **Auto-backup system**
- ✅ **Cross-device sync**
- ✅ **Session management**
- ✅ **Enterprise-grade reliability**

## 🔄 Future Updates

To update your deployment:
1. Make changes locally
2. Commit and push to Git
3. Vercel automatically redeploys
4. Your users get the latest version

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase dashboard
3. Review browser console errors
4. Verify environment variables

Your Promotion Planner is now production-ready! 🚀
