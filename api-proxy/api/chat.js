/**
 * Layr API Proxy - Serverless Function for Vercel
 * This proxies requests to Groq API with proper security controls
 */

/**
 * Rate limiting using in-memory store (for serverless, use Redis or Vercel KV in production)
 */
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(identifier) {
  const now = Date.now();
  const userRequests = rateLimitStore.get(identifier) || [];
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);
  
  // Cleanup old entries
  if (rateLimitStore.size > 1000) {
    const entriesToDelete = Array.from(rateLimitStore.keys()).slice(0, 100);
    entriesToDelete.forEach(key => rateLimitStore.delete(key));
  }
  
  return true;
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting by IP
  const clientIp = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      retryAfter: 60 
    });
  }

  // Validate API key exists without logging its presence
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    // DO NOT log details about missing API key - just fail safely
    return res.status(503).json({ 
      error: 'Service temporarily unavailable' 
    });
  }

  // Validate API key format (Groq keys start with 'gsk_')
  if (!apiKey.startsWith('gsk_')) {
    return res.status(503).json({ 
      error: 'Service configuration error' 
    });
  }

  try {
    const { prompt, model = 'llama-3.3-70b-versatile', maxTokens = 8000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
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
      // DO NOT log detailed error data which might contain sensitive info
      // Return generic error to client
      return res.status(response.status >= 500 ? 503 : response.status).json({ 
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
    // DO NOT log error details which might expose implementation
    return res.status(503).json({ 
      error: 'Internal server error',
      message: 'Service temporarily unavailable'
    });
  }
}
