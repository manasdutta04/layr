import { ProjectPlan } from './interfaces';

interface CacheEntry {
  timestamp: number;
  plan: ProjectPlan;
}

export class PlanCache {
  private static instance: PlanCache;
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number; // Time to live in ms

  private constructor(maxSize: number = 20, ttl: number = 1000 * 60 * 60) { // Default: 20 plans, 1 hour retention
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  public static getInstance(): PlanCache {
    if (!PlanCache.instance) {
      PlanCache.instance = new PlanCache();
    }
    return PlanCache.instance;
  }

  /**
   * Generates a unique key based on the prompt.
   * We normalize the prompt (trim + lowercase) to ensure slightly different inputs hit the same cache.
   */
  generateKey(prompt: string): string {
    return prompt.trim().toLowerCase();
  }

  get(prompt: string): ProjectPlan | null {
    const key = this.generateKey(prompt);
    const entry = this.cache.get(key);

    if (!entry) {return null;}

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // LRU Logic: Re-insert the item to mark it as "recently used" (moves to end of Map)
    this.cache.delete(key);
    this.cache.set(key, entry);

    console.log(`[PlanCache] Hit for: "${prompt.substring(0, 20)}..."`);
    return entry.plan;
  }

  set(prompt: string, plan: ProjectPlan): void {
    const key = this.generateKey(prompt);

    // Enforce Max Size
    if (this.cache.size >= this.maxSize) {
       // Delete the first item (oldest accessed)
       const firstKey = this.cache.keys().next().value;
       this.cache.delete(firstKey);
    }

    this.cache.set(key, { timestamp: Date.now(), plan });
    console.log(`[PlanCache] Stored: "${prompt.substring(0, 20)}..."`);
  }

  clear(): void {
    this.cache.clear();
  }
}