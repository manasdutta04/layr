/**
 * Layr API Proxy - Serverless Function for Vercel
 * This proxies requests to Groq API while keeping your API key secure
 */

export default async function handler(req, res) {
  // Handle CORS preflight
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());
  const origin = req.headers.origin || '';
  
  if (allowedOrigins.length > 0 && allowedOrigins[0] !== '' && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate a shared secret or extension token
  const clientToken = req.headers['x-layr-token'] || '';
  const expectedToken = process.env.LAYR_CLIENT_TOKEN || '';
  
  if (expectedToken && clientToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Basic rate limiting by IP (in production, use a proper rate limiter like upstash/ratelimit)
  // This is a placeholder — Vercel's edge middleware or an external service should handle this
  // For now, at minimum validate the token above

  try {
    const { prompt, model = 'llama-3.3-70b-versatile', maxTokens = 8000 } = req.body;

    // Validate model against allowlist
    const ALLOWED_MODELS = [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ];
    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ error: 'Invalid model specified' });
    }

    // Validate maxTokens bounds
    const sanitizedMaxTokens = Math.min(Math.max(parseInt(maxTokens, 10) || 8000, 100), 8000);

    // Validate prompt size (reject excessively large prompts)
    const promptStr = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    if (promptStr.length > 50000) {
      return res.status(400).json({ error: 'Prompt too large' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
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
        max_tokens: sanitizedMaxTokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      return res.status(response.status).json({ 
        error: 'AI service error. Please try again later.',
        code: response.status
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
      error: 'Internal server error. Please try again later.'
    });
  }
}
