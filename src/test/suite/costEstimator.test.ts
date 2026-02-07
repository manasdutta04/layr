import * as assert from 'assert';
import { estimateCost } from '../../cost-estimation/costEstimator';

suite('Cost Estimator Test Suite', () => {
    test('estimateCost returns free tier message for no services', () => {
        const input = "Create a simple static website using HTML and CSS.";
        const result = estimateCost(input);
        assert.ok(result.includes('$0/month'));
        assert.ok(result.includes('Free Tier'));
    });

    test('estimateCost detects specific services', () => {
        const input = "We need usage of aws-ec2 and also aws-s3 for storage.";
        const result = estimateCost(input);

        // Check for items in the table
        assert.ok(result.includes('EC2'));
        assert.ok(result.includes('S3'));

        // Calculate expected cost: 35 (EC2) + 23 (S3) = 58
        assert.ok(result.includes('$58/month'));
    });

    test('estimateCost suggests Vercel for React apps', () => {
        const input = "I am building a React application.";
        const result = estimateCost(input);

        // Check if Vercel is suggested
        assert.ok(result.includes('Vercel'));
        assert.ok(result.includes('$20/month'));
    });

    test('estimateCost logic is CASE INSENSITIVE', () => {
        const input = "WE NEED AWS-RDS AND OPENAI.";
        const result = estimateCost(input);

        assert.ok(result.includes('RDS'));
        assert.ok(result.includes('OpenAI'));

        // RDS ($50) + OpenAI ($40) = $90
        assert.ok(result.includes('$90/month'));
    });

    test('estimateCost suggests alternatives', () => {
        const input = "Use aws-rds for the database.";
        const result = estimateCost(input);

        // Should suggest Supabase or alternatives
        assert.ok(result.includes('Alternative Lower-Cost Stack'));
        assert.ok(result.includes('Supabase'));
        // Savings calculations checking
        // AWS RDS ($50) -> Supabase ($0) = Savings $50
        assert.ok(result.includes('-$50/month'));
    });
});
