import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import minimist from "minimist";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("shopifyClient.ts");

// Parse command line arguments
export const argv = minimist(process.argv.slice(2));
// Load environment variables from .env file (if it exists)
dotenv.config();
// Define environment variables - from command line or .env file

export const SHOPIFY_ACCESS_TOKEN = argv.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
export const MYSHOPIFY_DOMAIN = argv.domain || process.env.MYSHOPIFY_DOMAIN;
// Store in process.env for backwards compatibility
process.env.SHOPIFY_ACCESS_TOKEN = SHOPIFY_ACCESS_TOKEN;
process.env.MYSHOPIFY_DOMAIN = MYSHOPIFY_DOMAIN;
// Validate required environment variables
if (!SHOPIFY_ACCESS_TOKEN) {
  logger.error("Error: SHOPIFY_ACCESS_TOKEN is required.");
  logger.error("Please provide it via command line argument or .env file.");
  logger.error("  Command line: --accessToken=your_token");
  process.exit(1);
}
if (!MYSHOPIFY_DOMAIN) {
  logger.error("Error: MYSHOPIFY_DOMAIN is required.");
  logger.error("Please provide it via command line argument or .env file.");
  logger.error("  Command line: --domain=your-store.myshopify.com");
  process.exit(1);
}

// Create Shopify GraphQL client
export const shopifyClient = new GraphQLClient(
  `https://${MYSHOPIFY_DOMAIN}/admin/api/2025-10/graphql.json`,
  {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json"
    }
  }
);

