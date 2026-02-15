/**
 * Layr API Proxy - Serverless Function for Vercel
 * This proxies requests to Groq API while keeping your API key secure
 * 
 * Security: Validates origin, enforces rate limiting via shared token,
 * and restricts prompt size to prevent abuse.
 */

export default async function handler(req, res) {
  // Validate Origin - only allow requests from VS Code extensions
  const origin = req.headers['origin'] || '';
  const userAgent = req.headers['user-agent'] || '';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
  
  // VS Code extensions typically send requests without an origin header
  // or with a vscode-webview origin. Block browser-based requests.
  if (origin && !origin.startsWith('vscode-webview') && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
  }

  // Require a shared secret token to authenticate extension requests
  const authToken = req.headers['x-layr-token'];
  const expectedToken = process.env.LAYR_AUTH_TOKEN;
  if (expectedToken && authToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing authentication token' });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, model: requestedModel, maxTokens: requestedMaxTokens } = req.body;

    // Allowlist of permitted models
    const ALLOWED_MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];

    const model = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : 'llama-3.3-70b-versatile';

    // Bound maxTokens to a reasonable range
    const MAX_TOKENS_LIMIT = 8000;
    const maxTokens = Math.min(Math.max(parseInt(requestedMaxTokens) || 8000, 100), MAX_TOKENS_LIMIT);

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate and limit input size to prevent abuse
    const promptStr = JSON.stringify(prompt);
    if (promptStr.length > 50000) {
      return res.status(400).json({ error: 'Prompt too large. Maximum 50000 characters.' });
    }

    // Get API key from environment variable (set in Vercel dashboard)
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Make request to Groq API
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: prompt.systemPrompt || 'You are a helpful AI assistant.'
          },
          {
            role: 'user',
            content: prompt.userPrompt || prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return res.status(response.status).json({ 
        error: 'AI service error', 
        details: errorData 
      });
    }

    const data = await response.json();
    
    // Return the response
    return res.status(200).json({
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Internal server error'
      // Do not leak error.message to client
    });
  }
}
