
import { gql, GraphQLClient } from "graphql-request";
import z from "zod";
import util from "util";

let shopifyClient: GraphQLClient;

// Input schema for getOrderById
const GetDiscountInputSchema = z.object({
  limit: z.number().default(10)
});

type GetDiscountInput = z.infer<typeof GetDiscountInputSchema>;
const getDiscounts = {

    name:" get discount",
    description: "get discounts",
    schema: GetDiscountInputSchema,
    initialize(client: GraphQLClient){
        shopifyClient = client;
    },
    execute: async(input: GetDiscountInput) => {
    try {
        const { limit } = input;

        const query = gql`
            query ListAllCodeDiscounts($first: Int!) {
                codeDiscountNodes(first: $first) {
                    nodes {
                    id
                    codeDiscount {
                        ... on DiscountCodeBasic {
                        __typename
                        title
                        codes(first: $first) {
                            nodes {
                                code
                            }
                        }
                        summary
                        context {
                            __typename
                            ... on DiscountCustomers {
                                customers {
                                    __typename
                                }
                            }
                        }
                        }
                        ... on DiscountCodeBxgy {
                        __typename
                        title
                        codesCount {
                            count
                        }
                        codes(first: $first) {
                            nodes {
                                code
                            }
                        }
                        summary
                        }
                    }
                    }
                }
            }

        `;

        const variables = {
            first: limit
        }

        const data = (await shopifyClient.request(query, variables)) as {
            codeDiscountNodes: any;
        };
       // const discounts = data.codeDiscountNodes;
       const discounts = data.codeDiscountNodes.nodes.map((node: any) => {
            const discount = node;
            return {
                id: discount.id,
                title: discount.codeDiscount.title,
                code: discount.codeDiscount.codes.nodes.map((node: any) => {
                        const code = node;
                        return{
                            applicableCode:code.code
                        
                        }
                }),
                summary: discount.codeDiscount.summary
            };
        
        });
        console.log("discounts: " + util.inspect(data.codeDiscountNodes, false, null, true /* enable colors */));

        return {discounts};
    } catch (error) {
      console.error("Error fetching discounts:", error);
      throw new Error(
        `Failed to fetch discounts: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    }
};
export { getDiscounts };