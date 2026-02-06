import { detectServices } from './serviceDetector';
import { PRICING_DATABASE, ALTERNATIVES } from './pricingData';
import { logger } from '../utils/logger';

export function estimateCost(planText: string): string {
    logger.info('CostEstimator: Estimating costs for plan...');
    const services = detectServices(planText);
    logger.debug(`CostEstimator: Detected services: ${services.join(', ')}`);
    let totalCost = 0;
    let breakdownRows = '';
    let savings = 0;
    let alternativeText = '';

    // If no paid services found, return a basic message
    if (services.length === 0) {
        return "\n\n## 💰 Estimated Cloud Costs\n* **Total:** $0/month (Free Tier or Local Development)\n";
    }

    // Build the table and calculate total
    for (const id of services) {
        const item = PRICING_DATABASE[id];
        if (item) {
            totalCost += item.costPerMonth;
            breakdownRows += `| ${item.serviceName} | ${item.provider} | $${item.costPerMonth} | ${item.unit} |\n`;

            // Check for cheaper alternatives
            if (ALTERNATIVES[id]) {
                const altName = ALTERNATIVES[id];
                // Extract price from string like "DigitalOcean ($12/mo)" -> 12
                const priceMatch = altName.match(/\$(\d+)/);
                const altPrice = priceMatch ? parseInt(priceMatch[1]) : 0;
                
                if (altPrice < item.costPerMonth) {
                    savings += (item.costPerMonth - altPrice);
                    alternativeText += `- Replace **${item.serviceName}** ($${item.costPerMonth}) with **${altName}**\n`;
                }
            }
        }
    }

    // Construct the final Markdown output
    return `
## 💰 Estimated Monthly Costs
### For MEDIUM traffic (default assumptions)
- **Total: $${totalCost}/month** ($${totalCost * 12}/year)

#### Breakdown:
| Service | Provider | Cost | Notes |
|---------|----------|------|-------|
${breakdownRows}

${savings > 0 ? `### 💡 Alternative Lower-Cost Stack (-$${savings}/month):
${alternativeText}
   **New Total:** $${totalCost - savings}/month` : ''}
`;
}