import { PRICING_DATABASE } from './pricingData';

// Map keywords to Service IDs
const SERVICE_KEYWORDS: Record<string, string[]> = {
    'aws-ec2': ['ec2', 'virtual machine', 'compute engine', 'vm instance', 't3.medium'],
    'aws-s3': ['s3', 'blob storage', 'object storage', 'file storage', 'bucket'],
    'aws-lambda': ['lambda', 'serverless function', 'cloud function'],
    'aws-rds': ['rds', 'relational database', 'postgres', 'mysql', 'sql database'],
    'vercel': ['vercel', 'next.js hosting', 'frontend hosting'],
    'netlify': ['netlify', 'static hosting'],
    'mongodb': ['mongodb', 'atlas', 'nosql document'],
    'redis': ['redis', 'caching', 'key-value store'],
    'supabase': ['supabase', 'backend as a service'],
    'github-actions': ['github actions', 'ci/cd', 'pipeline'],
    'auth0': ['auth0', 'authentication', 'oauth'],
    'openai': ['openai', 'gpt', 'llm', 'ai model']
};

export function detectServices(planText: string): string[] {
    const detectedIds = new Set<string>();
    const lowerText = planText.toLowerCase();

    // Scan text for keywords
    for (const [serviceId, keywords] of Object.entries(SERVICE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                detectedIds.add(serviceId);
                break; // Found one keyword for this service, move to next service
            }
        }
    }

    // Default: If no specific hosting found but "react" is mentioned, suggest Vercel
    if (lowerText.includes('react') && !detectedIds.has('vercel') && !detectedIds.has('netlify')) {
        detectedIds.add('vercel');
    }

    return Array.from(detectedIds);
}