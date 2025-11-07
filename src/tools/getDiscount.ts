
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
                id,
                codeDiscount {
                    ... on DiscountCodeBasic {
                    __typename
                    title
                    status
                    codes(first:$first){
                        nodes{
                        code
                        }
                    }
                    summary
                    context
                        {
                            __typename,
                            ... on DiscountCustomers{
                                customers
                                {
                                    __typename
                                }
                                }
                        }
                    }
                    ... on DiscountCodeBxgy {
                    __typename
                    title
                    status
                    codes(first:$first){
                        nodes
                        {
                            code
                        }
                    }
                    summary
                    customerBuys{
                        items
                        {
                        __typename
                        ... on DiscountProducts
                        {
                            __typename,
                            products(first:$first)
                            {
                                nodes 
                                {
                                    id
                                    title
                                    description
                                }
                            }
                        }
                        },
                        value {
                        __typename
                        ... on DiscountPurchaseAmount
                        {
                            amount 
                        }
                        ... on DiscountQuantity
                        {
                            quantity
                        }
                        }
                    }
                    customerGets {
                        items
                        {
                        __typename
                        ... on DiscountProducts
                            {
                                __typename,
                                products(first:$first)
                                {
                                    nodes
                                    {
                                        title
                                        description
                                    }
                                }
                            }
                        }
                        value {
                        __typename
                        ... on DiscountAmount
                        {
                            amount{
                            amount,
                            currencyCode
                            }
                        }
                        ... on DiscountOnQuantity
                        {
                            quantity{
                            quantity
                            }
                            effect{
                            __typename,
                            ... on DiscountPercentage 
                            {
                                percentage
                            }
                            ... on DiscountAmount
                            {
                                amount{
                                amount
                                }
                                appliesOnEachItem
                            }
                            }
                        }
                        ... on DiscountPercentage
                        {
                            percentage
                        }
                        }
                    }
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
            const  customerbuysProduct = discount.codeDiscount.customerBuys?.items?.products?.nodes.map((productNode:any) => {
                    return {
                        title: productNode.title,
                        description: productNode.description
                    }
                });
            const customerGetsProduct = discount.codeDiscount.customerGets?.items?.products?.nodes.map((productNode:any) => {
                    return {
                        title: productNode.title,
                        description: productNode.description
                    }
                });
            return {
                id: discount.id,
                title: discount.codeDiscount.title,
                code: discount.codeDiscount.codes.nodes.map((node: any) => {
                        const code = node;
                        return{
                            applicableCode:code.code
                        
                        }
                }),
                summary: discount.codeDiscount.summary,
                //customerbuys1: discount.codeDiscount.customerBuys,
                customerBuysDetails: {
                    product: customerbuysProduct,
                    quantity:discount.codeDiscount.customerBuys?.value?.quantity
                },
                //customergets1: discount.codeDiscount.customerGets,
                customerGetsDetails: {
                    product: customerGetsProduct,
                    quantity: discount.codeDiscount.customerGets?.value?.quantity.quantity,
                    typeName: discount.codeDiscount.customerGets?.value?.effect.__typename,
                    percentage: discount.codeDiscount.customerGets?.value?.effect.percentage,
                }
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