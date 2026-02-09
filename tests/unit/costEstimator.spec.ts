import { describe, it, expect } from 'vitest';
import { estimateCost } from '../../src/cost-estimation/costEstimator';

describe('CostEstimator', () => {
  it('returns free tier message when no services detected', () => {
    const input = 'Simple static site';
    const result = estimateCost(input);
    expect(result).toContain('$0/month');
  });

  it('detects multiple services and sums cost', () => {
    const input = 'Use aws-ec2 and aws-s3';
    const result = estimateCost(input);
    expect(result).toContain('EC2');
    expect(result).toContain('S3');
    expect(result).toContain('$58/month');
  });

  it('suggests Vercel for React', () => {
    const input = 'React app';
    const result = estimateCost(input);
    expect(result).toContain('Vercel');
  });

  it('is case insensitive', () => {
    const input = 'USE AWS-RDS AND OPENAI';
    const result = estimateCost(input);
    expect(result).toContain('$90/month');
  });

  it('shows alternative stack savings', () => {
    const input = 'Use aws-rds';
    const result = estimateCost(input);
    expect(result).toContain('Alternative Lower-Cost Stack');
    expect(result).toContain('-$50/month');
  });
});
