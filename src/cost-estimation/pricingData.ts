export interface ServicePrice {
    id: string;
    provider: string;
    serviceName: string;
    costPerMonth: number;
    unit: string;
    category: 'compute' | 'database' | 'storage' | 'hosting' | 'other';
}

export const PRICING_DATABASE: Record<string, ServicePrice> = {
    // AWS
    'aws-ec2': { id: 'aws-ec2', provider: 'AWS', serviceName: 'EC2 (t3.medium)', costPerMonth: 35, unit: 'instance', category: 'compute' },
    'aws-s3': { id: 'aws-s3', provider: 'AWS', serviceName: 'S3 Standard', costPerMonth: 23, unit: 'TB storage', category: 'storage' },
    'aws-lambda': { id: 'aws-lambda', provider: 'AWS', serviceName: 'Lambda', costPerMonth: 10, unit: 'million requests', category: 'compute' },
    'aws-rds': { id: 'aws-rds', provider: 'AWS', serviceName: 'RDS (Postgres)', costPerMonth: 50, unit: 'db.t3.medium', category: 'database' },

    // Vercel / Netlify
    'vercel': { id: 'vercel', provider: 'Vercel', serviceName: 'Vercel Pro', costPerMonth: 20, unit: 'per member', category: 'hosting' },
    'netlify': { id: 'netlify', provider: 'Netlify', serviceName: 'Netlify Pro', costPerMonth: 19, unit: 'per member', category: 'hosting' },

    // Databases
    'mongodb': { id: 'mongodb', provider: 'MongoDB', serviceName: 'Atlas M10', costPerMonth: 57, unit: 'cluster', category: 'database' },
    'redis': { id: 'redis', provider: 'Redis', serviceName: 'Redis Cloud', costPerMonth: 12, unit: '1GB', category: 'database' },
    'supabase': { id: 'supabase', provider: 'Supabase', serviceName: 'Pro Plan', costPerMonth: 25, unit: 'project', category: 'database' },

    // CI/CD & Others
    'github-actions': { id: 'github-actions', provider: 'GitHub', serviceName: 'GitHub Actions', costPerMonth: 0, unit: 'free tier', category: 'other' },
    'auth0': { id: 'auth0', provider: 'Auth0', serviceName: 'B2C Essentials', costPerMonth: 35, unit: '7k users', category: 'other' },
    'openai': { id: 'openai', provider: 'OpenAI', serviceName: 'GPT-4 API', costPerMonth: 40, unit: 'est. usage', category: 'other' }
};

export const ALTERNATIVES: Record<string, string> = {
    'aws-ec2': 'DigitalOcean Droplet ($12/mo)',
    'aws-rds': 'Supabase Free Tier ($0/mo)',
    'mongodb': 'MongoDB Atlas Free Tier ($0/mo)',
    'vercel': 'Vercel Hobby Tier ($0/mo)'
};