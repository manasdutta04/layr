import * as assert from 'assert';
import { RuleBasedPlanGenerator } from '../../planner/rules';

suite('RuleBasedPlanGenerator Test Suite', () => {
    test('isAvailable returns true', async () => {
        const generator = new RuleBasedPlanGenerator();
        assert.strictEqual(await generator.isAvailable(), true);
    });

    test('generatePlan returns a plan', async () => {
        const generator = new RuleBasedPlanGenerator();
        const plan = await generator.generatePlan('A React website');
        assert.ok(plan.title.includes('Web Application'));
        assert.strictEqual(plan.generatedBy, 'rules');
    });

    test('generatePlan matches keywords', async () => {
        const generator = new RuleBasedPlanGenerator();
        const plan = await generator.generatePlan('my cool mobile app');
        assert.ok(plan.title.includes('Mobile Application'));
    });

    test('generatePlan matches backend', async () => {
        const generator = new RuleBasedPlanGenerator();
        const plan = await generator.generatePlan('an express api');
        assert.ok(plan.title.includes('Backend API'));
    });
});
