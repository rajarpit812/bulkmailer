# Deployment Guide

## Quick Deployment Options

### Option 1: Heroku (Recommended)

1. **Create Heroku account**: [heroku.com](https://heroku.com)
2. **Install Heroku CLI**: [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. **Deploy:**
   ```bash
   # Login to Heroku
   heroku login
   
   # Create app
   heroku create your-app-name
   
   # Set environment variables
   heroku config:set GOOGLE_CLIENT_ID=your-client-id
   heroku config:set GOOGLE_CLIENT_SECRET=your-client-secret
   heroku config:set GOOGLE_REDIRECT_URI=https://your-app-name.herokuapp.com/auth/google/callback
   heroku config:set SESSION_SECRET=your-random-secret
   heroku config:set NODE_ENV=production
   
   # Deploy
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Option 2: Vercel

1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**: `vercel --prod`
3. **Set environment variables** in Vercel dashboard

### Option 3: Railway

1. **Connect GitHub**: [railway.app](https://railway.app)
2. **Deploy from GitHub repository**
3. **Set environment variables** in Railway dashboard

## Google OAuth Configuration for Production

1. **Update OAuth Consent Screen**:
   - Application home page: `https://your-domain.com`
   - Privacy policy: `https://your-domain.com/privacy`
   - Terms of service: `https://your-domain.com/terms`

2. **Update OAuth Credentials**:
   - Authorized JavaScript origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/auth/google/callback`

3. **Submit for Verification**:
   - Go to OAuth consent screen
   - Click "Submit for Verification"
   - Provide detailed explanation of app functionality

## Environment Variables for Production

```
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/auth/google/callback
SESSION_SECRET=your-strong-random-secret
NODE_ENV=production
PORT=3000
```

## Verification Process Timeline

- **Initial submission**: 1-2 weeks
- **Additional information requests**: 3-7 days response time
- **Final approval**: 1-2 weeks after all requirements met
- **Total time**: 2-6 weeks typically

## Tips for Faster Approval

1. **Professional domain**: Use a real domain, not localhost
2. **Complete documentation**: Fill all OAuth consent screen fields
3. **Clear app description**: Explain individual email sending (not spam)
4. **Privacy compliance**: Emphasize data protection and user consent
5. **Responsive support**: Respond quickly to Google's requests for information