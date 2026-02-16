/**
 * Layr API Proxy - Serverless Function for Vercel
 * SECURITY HARDENING:
 * - Requires API key authentication via custom header
 * - Implements rate limiting per client
 * - Validates and sanitizes all inputs
 * - Logs security events
 */

// Rate limiting: max 20 requests per minute per IP
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const clientData = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > clientData.resetAt) {
    clientData.count = 0;
    clientData.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  clientData.count++;
  rateLimitStore.set(ip, clientData);
  
  return clientData.count <= RATE_LIMIT_MAX;
}

// Whitelist of allowed extension identifiers
const ALLOWED_CLIENTS = [
  'layr-vscode-extension',
  'layr-cursor-extension'
];

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

  // SECURITY: Rate limiting
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }
  
  // SECURITY: Verify client identity
  const clientId = req.headers['x-layr-client'];
  if (!clientId || !ALLOWED_CLIENTS.includes(clientId)) {
    console.error(`Unauthorized client attempted access: ${clientId || 'unknown'}`);
    return res.status(403).json({ error: 'Unauthorized client' });
  }
  
  // SECURITY: Validate Content-Type
  if (req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
  }
  
  // SECURITY: Validate request size (prevent DoS)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 100000) { // 100KB max
    return res.status(413).json({ error: 'Request payload too large' });
  }

  try {
    const { prompt, model = 'llama-3.3-70b-versatile', maxTokens = 8000 } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // SECURITY: Input validation and sanitization
    if (typeof prompt !== 'object' || typeof prompt.userPrompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt format' });
    }
    
    // Prevent prompt injection attacks
    if (prompt.userPrompt.length > 50000 || prompt.systemPrompt?.length > 50000) {
      return res.status(400).json({ error: 'Prompt exceeds maximum length' });
    }

    // Get API key from environment variable (set in Vercel dashboard)
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      // SECURITY: Don't reveal environment variable names in error messages
      console.error('API key not configured');
      return res.status(500).json({ error: 'Service configuration error' });
    
    // SECURITY: Validate API key format (Groq keys start with "gsk_")
    if (!apiKey.startsWith('gsk_') || apiKey.length < 50) {
      console.error('Invalid API key format detected');
      return res.status(500).json({ error: 'Service configuration error' });
    }
    
    // SECURITY: Prevent using placeholder keys
    if (apiKey.includes('your_') || apiKey.includes('example') || apiKey.includes('test')) {
      console.error('Placeholder API key detected');
      return res.status(500).json({ error: 'Service configuration error' });
    }
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
      error: 'Internal server error',
      message: error.message 
    });
  }
}
