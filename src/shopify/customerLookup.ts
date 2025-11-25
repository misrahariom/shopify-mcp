import { any } from "zod";
import { shopifyClient } from "./shopifyClient.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("customerLookup.ts");
export async function findCustomerByPhone(phone: string) {
    const q = `phone:${phone}`;
    logger.info("GraphQL query:", q);
    const query = `
        query($q: String!) {
            customers(first: 1, query: $q) {
                edges {
                node {
                        id
                        displayName
                        metafields(first: 10) {
                            edges {
                                node {
                                namespace
                                key
                                value
                                }
                            }
                        }
                    }
                }
            }
        }
    `;
    const result: any = await shopifyClient.request(query, { q });
    const node = result.customers?.edges[0]?.node;
    return node || null;
}

export function extractPin(customer: any) {
    const fields = customer?.metafields?.edges || [];
    const field = fields.find(
        (m: any) => m.node.namespace === "custom" && m.node.key === "pin"
    );
    // logger.info("PIN from DB:", field?.node?.value)
    return field?.node?.value || null;
}