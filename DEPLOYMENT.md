# Deployment Guide - RepoLens AI

Complete guide for deploying RepoLens AI to production.

## Overview

- **Backend**: Deploy to Render (or Railway, Fly.io)
- **Frontend**: Deploy to Vercel (or Netlify)
- **Estimated Time**: 15-20 minutes

## Prerequisites

- GitHub account
- Render account (free tier)
- Vercel account (free tier)
- IBM Bob API key

---

## Part 1: Backend Deployment (Render)

### Step 1: Prepare Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 3: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the repository: `RepoLens-AI`

### Step 4: Configure Service

**Basic Settings:**
- **Name**: `repolens-backend`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`

**Build Settings:**
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 5: Environment Variables

Add these environment variables:

| Key | Value |
|-----|-------|
| `IBM_BOB_API_KEY` | Your IBM Bob API key |
| `IBM_BOB_API_URL` | IBM Bob API endpoint |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` (add later) |

### Step 6: Deploy

1. Click "Create Web Service"
2. Wait for deployment (3-5 minutes)
3. Note your backend URL: `https://repolens-backend.onrender.com`

### Step 7: Test Backend

```bash
curl https://repolens-backend.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "RepoLens AI"
}
```

---

## Part 2: Frontend Deployment (Vercel)

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Authorize Vercel

### Step 2: Import Project

1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Select `RepoLens-AI`

### Step 3: Configure Project

**Framework Preset**: Next.js (auto-detected)

**Root Directory**: `frontend`

**Build Settings** (auto-configured):
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### Step 4: Environment Variables

Add this environment variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://repolens-backend.onrender.com` |

Use your actual Render backend URL from Part 1.

### Step 5: Deploy

1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Note your frontend URL: `https://repolens-ai.vercel.app`

### Step 6: Update Backend CORS

Go back to Render and update the `FRONTEND_URL` environment variable with your Vercel URL.

### Step 7: Test Application

1. Visit your Vercel URL
2. Paste a GitHub repository URL
3. Click "Analyze Repository"
4. Verify results appear

---

## Part 3: Custom Domain (Optional)

### Frontend Domain (Vercel)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### Backend Domain (Render)

1. Go to Service Settings → Custom Domain
2. Add your custom domain
3. Configure DNS records
4. Wait for SSL certificate (automatic)

---

## Troubleshooting

### Backend Issues

**Build Fails:**
```bash
# Check requirements.txt is correct
# Ensure Python version is 3.11+
# Check Render logs for specific errors
```

**Service Won't Start:**
- Verify start command is correct
- Check environment variables are set
- Review Render logs

**API Errors:**
- Verify IBM_BOB_API_KEY is correct
- Check API endpoint URL
- Test with mock mode first

### Frontend Issues

**Build Fails:**
```bash
# Check package.json is correct
# Ensure Node version is 18+
# Review Vercel build logs
```

**Can't Connect to Backend:**
- Verify NEXT_PUBLIC_API_URL is correct
- Check backend is running
- Test backend health endpoint
- Check CORS configuration

**Environment Variables Not Working:**
- Ensure they start with `NEXT_PUBLIC_`
- Redeploy after adding variables
- Check browser console for errors

---

## Monitoring & Maintenance

### Render

**View Logs:**
1. Go to your service
2. Click "Logs" tab
3. Monitor real-time logs

**Metrics:**
- CPU usage
- Memory usage
- Request count
- Response times

### Vercel

**Analytics:**
1. Go to your project
2. Click "Analytics" tab
3. View traffic and performance

**Logs:**
1. Click "Deployments"
2. Select a deployment
3. View function logs

---

## Scaling

### Backend (Render)

**Free Tier Limits:**
- 512 MB RAM
- Shared CPU
- Sleeps after 15 min inactivity

**Upgrade Options:**
- Starter: $7/month (512 MB RAM, always on)
- Standard: $25/month (2 GB RAM)
- Pro: $85/month (4 GB RAM)

### Frontend (Vercel)

**Free Tier Limits:**
- 100 GB bandwidth
- Unlimited deployments
- Automatic scaling

**Upgrade Options:**
- Pro: $20/month (1 TB bandwidth)
- Enterprise: Custom pricing

---

## Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use different keys for dev/prod
   - Rotate keys regularly

2. **API Keys:**
   - Keep IBM Bob API key secure
   - Monitor usage
   - Set up rate limiting

3. **CORS:**
   - Only allow your frontend domain
   - Don't use wildcard (*) in production

4. **Updates:**
   - Keep dependencies updated
   - Monitor security advisories
   - Test before deploying

---

## Rollback Procedure

### Render

1. Go to "Deploys" tab
2. Find previous successful deploy
3. Click "Redeploy"

### Vercel

1. Go to "Deployments"
2. Find previous deployment
3. Click "..." → "Promote to Production"

---

## Cost Estimation

### Free Tier (Recommended for Hackathon)

- **Render**: Free (with sleep)
- **Vercel**: Free
- **Total**: $0/month

### Production Tier

- **Render Starter**: $7/month
- **Vercel Pro**: $20/month
- **Total**: $27/month

---

## Post-Deployment Checklist

- [ ] Backend health check passes
- [ ] Frontend loads correctly
- [ ] Can analyze a repository
- [ ] Results display properly
- [ ] Error handling works
- [ ] Mobile responsive
- [ ] CORS configured
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up
- [ ] Documentation updated

---

## Support

If you need help:
1. Check Render/Vercel documentation
2. Review deployment logs
3. Test locally first
4. Open an issue on GitHub

---

**Congratulations!** 🎉 Your RepoLens AI is now live!