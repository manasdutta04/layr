# Layr API Proxy

This is a secure serverless API proxy that keeps your Groq API key safe.

## 🔒 CRITICAL SECURITY NOTES

1. **NEVER commit your `.env` file** - Add it to `.gitignore` immediately
2. **Use Vercel environment variables** - Set secrets in Vercel dashboard, NOT in code
3. **Rotate API keys regularly** - Change keys every 90 days minimum
4. **Monitor API usage** - Check Groq dashboard for unusual activity
5. **Enable Vercel secret scanning** - Use Vercel's built-in security features
6. **Implement request signing** - Add HMAC validation for production deployments
7. **Use separate keys per environment** - Never reuse production keys in development

## 🚀 Free Deployment to Vercel

### Prerequisites
- GitHub account
- Vercel account (free) - sign up at https://vercel.com

### Deployment Steps

#### 1. Install Vercel CLI (Optional for local testing)
```bash
npm install -g vercel
```

#### 2. Deploy to Vercel

**Option A: Deploy via GitHub (Recommended)**
1. Push this `api-proxy` folder to your GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Set Root Directory to `api-proxy`
6. Add Environment Variable:
   - Key: `GROQ_API_KEY`
   - Value: `your_groq_api_key_here`
7. Click "Deploy"

**Option B: Deploy via CLI**
```bash
cd api-proxy
vercel
# Follow the prompts
# When asked, enter your GROQ_API_KEY as an environment variable
```

#### 3. Get Your API Endpoint
After deployment, Vercel will give you a URL like:
```
https://your-project-name.vercel.app
```

Your API endpoint will be:
```
https://your-project-name.vercel.app/api/chat
```

#### 4. Update Extension Code

**SECURITY WARNING:** Do NOT hardcode the proxy URL in production releases.
Use environment-based configuration or VS Code settings.

For development/testing only:
```typescript
// In development only - use settings in production
private readonly PROXY_URL = process.env.LAYR_PROXY_URL || 'http://localhost:3000/api/chat';
```

Copy your Vercel URL and update `src/planner/providers/groq.ts`:
```typescript
private baseURL = 'https://your-project-name.vercel.app/api/chat';
```

## 🧪 Local Testing

1. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
# IMPORTANT: Verify .env is in .gitignore before committing any code
```

2. Install dependencies:
```bash
npm install
```

3. Run locally:
```bash
npm run dev
```

4. Test the endpoint:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a simple hello world app",
    "model": "llama-3.3-70b-versatile",
    "maxTokens": 8000
  }'
```

## 🔒 Security Features

- ✅ API key stored as Vercel environment variable (encrypted at rest)
- ✅ Rate limiting (10 requests per minute per IP)
- ✅ API key format validation
- ✅ Generic error messages (no information leakage)
- ✅ Request validation and sanitization
- ✅ Never exposed in client-side code
- ✅ CORS enabled for your extension
- ✅ Rate limiting (via Vercel's built-in limits)
- ✅ Automatic HTTPS

## 📊 Monitoring

View usage and logs in your [Vercel Dashboard](https://vercel.com/dashboard):
- Real-time function logs
- Request analytics
- Error tracking

## 💰 Pricing

Vercel Free Tier includes:
- ✅ 100 GB bandwidth/month
- ✅ 100,000 function invocations/month
- ✅ Unlimited projects
- ✅ Automatic SSL

**This is more than enough for a VS Code extension!**

## 🔄 Updates

To update your deployed proxy:
1. Make changes to the code
2. Commit and push to GitHub
3. Vercel automatically redeploys

Or via CLI:
```bash
vercel --prod
```

## 📝 API Endpoint Usage

### Request Format
```json
POST https://your-app.vercel.app/api/chat
Content-Type: application/json

{
  "prompt": {
    "systemPrompt": "You are an AI assistant...",
    "userPrompt": "Create a React app"
  },
  "model": "llama-3.3-70b-versatile",
  "maxTokens": 8000
}
```

### Response Format
```json
{
  "success": true,
  "content": "Generated plan content...",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 500,
    "total_tokens": 600
  }
}
```

## 🐛 Troubleshooting

### "API configuration error"
- Make sure `GROQ_API_KEY` is set in Vercel environment variables
- Redeploy after adding environment variables

### CORS errors
- Check that `vercel.json` has correct CORS headers
- Verify the request is coming from your extension

### Rate limiting
- Groq free tier: Check your usage at console.groq.com
- Vercel limits: Check your Vercel dashboard

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Groq API Documentation](https://console.groq.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
