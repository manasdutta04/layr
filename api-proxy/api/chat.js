/**
 * Layr API Proxy - Serverless Function for Vercel
 * This proxies requests to Groq API while keeping your API key secure
 */

export default async function handler(req, res) {
  // Verify request has a valid extension token
  const extensionToken = req.headers['x-layr-token'];
  const expectedToken = process.env.LAYR_EXTENSION_TOKEN;
  
  if (!expectedToken || extensionToken !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing extension token' });
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

    // Validate and sanitize maxTokens to prevent abuse
    const sanitizedMaxTokens = Math.min(Math.max(parseInt(maxTokens) || 8000, 100), 8000);
    
    // Validate model name against allowed list
    const allowedModels = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
    const sanitizedModel = allowedModels.includes(model) ? model : 'llama-3.3-70b-versatile';

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
      return res.status(502).json({ 
        error: 'AI service temporarily unavailable. Please try again.',
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
      error: 'An internal error occurred. Please try again later.'
    });
  }
}
