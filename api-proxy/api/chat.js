/**
 * Layr API Proxy - Serverless Function for Vercel
 * This proxies requests to Groq API while keeping your API key secure
 */

export default async function handler(req, res) {
  // Validate origin - only allow requests from VS Code extensions
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  const userAgent = req.headers['user-agent'] || '';
  
  // VS Code extensions typically have specific user agents
  // Add a shared secret header for additional authentication
  const authToken = req.headers['x-layr-token'];
  const expectedToken = process.env.LAYR_AUTH_TOKEN;
  
  if (expectedToken && authToken !== expectedToken) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Basic rate limiting via simple request validation
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
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
    const { prompt, model = 'llama-3.3-70b-versatile', maxTokens = 8000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate maxTokens to prevent abuse
    const sanitizedMaxTokens = Math.min(Math.max(parseInt(maxTokens) || 8000, 100), 8000);

    // Validate model to prevent arbitrary model usage
    const allowedModels = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    if (!allowedModels.includes(model)) {
      return res.status(400).json({ error: 'Invalid model specified' });
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
      // Do not forward internal error details to the client
      return res.status(response.status >= 500 ? 502 : response.status).json({ 
        error: 'AI service error. Please try again later.',
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
    // Never expose internal error details to clients
    return res.status(500).json({ 
      error: 'Internal server error. Please try again later.'
    });
  }
}
