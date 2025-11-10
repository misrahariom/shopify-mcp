
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
        // Deep cleaner: removes nulls, undefined, empty strings, empty arrays, and empty objects recursively
        function cleanObject(obj: any): any {
        if (Array.isArray(obj)) {
            const cleanedArray = obj
            .map(cleanObject)
            .filter((v) => v != null && !(typeof v === "object" && Object.keys(v).length === 0));
            return cleanedArray.length > 0 ? cleanedArray : undefined;
        } else if (obj && typeof obj === "object") {
            const cleanedObj = Object.entries(obj).reduce((acc, [key, value]) => {
            const cleanedValue = cleanObject(value);
            if (
                cleanedValue != null &&
                cleanedValue !== "" &&
                !(typeof cleanedValue === "object" && Object.keys(cleanedValue).length === 0)
            ) {
                acc[key] = cleanedValue;
            }
            return acc;
            }, {} as any);
            return Object.keys(cleanedObj).length > 0 ? cleanedObj : undefined;
        }
        return obj;
        }
        // Helper: extract effect details
        function extractEffect(effect: any): string | undefined {
        if (!effect || !effect.__typename) return undefined;

        switch (effect.__typename) {
            case "DiscountPercentage": {
            const pct = effect.percentage;
            return typeof pct === "number" ? `${pct * 100}%` : undefined;
            }
            case "DiscountAmount": {
            const amt = effect.amount?.amount;
            return amt ? `$${amt}` : undefined;
            }
            case "DiscountFree":
            case "Free":
            return "Free";
            default:
            return undefined;
        }
        }
        console.log("codeDiscountNodes:", util.inspect(data.codeDiscountNodes, false, null, true));
        // Main transformation logic
        const discounts = data.codeDiscountNodes.nodes.map((node: any) => {
        const discount = node.codeDiscount;
        console.log("discount:", util.inspect(discount, false, null, true));
        const mapProducts = (productNodes: any[]) =>
            productNodes?.map((product: any) => ({
            title: product.title,
            description: product.description,
            })) || [];

        const customerBuys = discount.customerBuys;
        const customerGets = discount.customerGets;
        const effect = customerGets?.value?.effect;
        const transformed = {
            id: node.id,
            title: discount.title,
            summary: discount.summary,
            codes: discount.codes?.nodes?.map((c: any) => ({
            applicableCode: c.code,
            })) || [],
            customerBuys: {
            products: mapProducts(customerBuys?.items?.products?.nodes),
            quantity: customerBuys?.value?.quantity,
            },
            customerGets: {
            products: mapProducts(customerGets?.items?.products?.nodes),
            quantity: customerGets?.value?.quantity?.quantity,
            typeName: customerGets?.value?.effect?.__typename,
            effectValue: extractEffect(effect),
            },
        };
        return cleanObject(transformed);
        });

        console.log("Discounts:", util.inspect(discounts, false, null, true));

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