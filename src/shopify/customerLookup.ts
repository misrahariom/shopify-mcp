import { any } from "zod";
import { shopifyClient } from "./shopifyClient.js";

export async function findCustomerByPhone(phone: string) {
    const q = `phone:${phone}`;

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
    console.log("::{q}uery::", {q},":::query::", q);
    console.log("::shopifyClient::", shopifyClient);
    const result:any = await shopifyClient.request(query, {q});
    console.log("::result::", result);
    const node = result.customers.edges[0]?.node;
    console.log("::customer node::", node);
    return node || null;
}

export function extractPin(customer: any) {
    console.log("customer", customer)
    console.log("metafields", customer.metafields)
    console.log("edges", customer.metafields?.edges)
  const fields = customer.metafields?.edges || [];
  const field = fields.find(
    (m:any) => m.node.namespace === "custom" && m.node.key === "pin"
  );
  console.log("field?.node?.value", field?.node?.value)
  return field?.node?.value || null;
}