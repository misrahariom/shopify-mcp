#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { randomUUID } from "node:crypto";
import { z } from "zod";
import express, { Request, Response } from "express";
import cors from 'cors';
import bodyParser from "body-parser";
import { inboundCall } from "./twilio/inbound.js";
import { verifyPin } from "./twilio/verifyPin.js";

// Import tools
import { getCustomerOrders } from "./tools/getCustomerOrders.js";
import { getCustomers } from "./tools/getCustomers.js";
import { getOrderById } from "./tools/getOrderById.js";
import { getOrderByNumber } from "./tools/getOrderByNumber.js";
import { getOrders } from "./tools/getOrders.js";
import { getProductById } from "./tools/getProductById.js";
import { getProducts } from "./tools/getProducts.js";
import { updateCustomer } from "./tools/updateCustomer.js";
import { updateOrder } from "./tools/updateOrder.js";
import { createProduct } from "./tools/createProduct.js";
import { getDiscounts } from "./tools/getDiscount.js";
import { argv, shopifyClient } from "./shopify/shopifyClient.js";

// Server configuration
const TRANSPORT_TYPE = argv.transport || process.env.TRANSPORT_TYPE || "http";
const HTTP_PORT = parseInt(argv.port || process.env.HTTP_PORT || "3000");
const SSE_PORT = parseInt(argv.ssePort || process.env.SSE_PORT || "3001");

// Initialize tools with shopifyClient
getProducts.initialize(shopifyClient);
getProductById.initialize(shopifyClient);
getCustomers.initialize(shopifyClient);
getOrders.initialize(shopifyClient);
getOrderById.initialize(shopifyClient);
getOrderByNumber.initialize(shopifyClient);
updateOrder.initialize(shopifyClient);
getCustomerOrders.initialize(shopifyClient);
updateCustomer.initialize(shopifyClient);
createProduct.initialize(shopifyClient);
getDiscounts.initialize(shopifyClient);

// Set up MCP server
const getServer = () => { 
const server = new McpServer({
  name: "shopify",
  version: "1.0.0",
  description:
    "MCP Server for Shopify API, enabling interaction with store data through GraphQL API"
});

server.tool(
  "get-discounts",
  {
    limit: z.number().default(10)
  },
  async(args) => {
    const result = await getDiscounts.execute(args);
    return {
       content: [{ type: "text", text: JSON.stringify(result) }]
    }
  }
);
// Add tools individually, using their schemas directly
server.tool(
  "get-products",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getProducts.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-product-by-id",
  {
    productId: z.string().min(1)
  },
  async (args) => {
    const result = await getProductById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createProduct tool
server.tool(
  "create-product",
  {
    title: z.string().min(1),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
  },
  async (args) => {
    const result = await createProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-customers",
  {
    searchQuery: z.string().optional(),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getCustomers.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-orders",
  {
    status: z.enum(["any", "open", "closed", "cancelled"]).default("any"),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getOrders.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getOrderById tool
/*server.tool(
  "get-order-by-id",
  {
    orderId: z.string().min(1)
  },
  async (args) => {
    const result = await getOrderById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);*/

// Add the getOrderByNumber tool
server.tool(
  "get-order-by-number",
  {
    orderNumber: z.string().min(1)
  },
  async (args) => {
    const result = await getOrderByNumber.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateOrder tool
server.tool(
  "update-order",
  {
    id: z.string().min(1),
    tags: z.array(z.string()).optional(),
    email: z.string().email().optional(),
    note: z.string().optional(),
    customAttributes: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional()
        })
      )
      .optional(),
    shippingAddress: z
      .object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        company: z.string().optional(),
        country: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        province: z.string().optional(),
        zip: z.string().optional()
      })
      .optional()
  },
  async (args) => {
    const result = await updateOrder.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getCustomerOrders tool
server.tool(
  "get-customer-orders",
  {
    customerId: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    limit: z.number().default(100)
  },
  async (args) => {
    const result = await getCustomerOrders.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateCustomer tool
server.tool(
  "update-customer",
  {
    id: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
    taxExempt: z.boolean().optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional()
        })
      )
      .optional()
  },
  async (args) => {
    const result = await updateCustomer.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);
return server;
}

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/twilio/inbound", inboundCall);
app.post("/twilio/verify-pin", verifyPin);

// Function to start server with different transports
async function startServer() {
  const server = getServer();
  try {
    switch (TRANSPORT_TYPE.toLowerCase()) {
      case "stdio":
        console.error("Starting MCP server with STDIO transport...");
        const stdioTransport = new StdioServerTransport();
        await server.connect(stdioTransport);
        console.error("STDIO server started successfully");
        break;

      case "sse":
        console.error(`Starting MCP server with SSE transport on port ${SSE_PORT}...`);
        const sseTransport = {sse: {} as Record<string, SSEServerTransport>};
        app.get('/sse', async (req, res) => {
          const transport = new SSEServerTransport('/messages', res);
          sseTransport.sse[transport.sessionId] = transport;
          res.on("close", () => {
            delete sseTransport.sse[transport.sessionId];
          });

          await server.connect(transport);
        });

        app.post('/messages', async (req, res) => {
          const sessionId = req.query.sessionId as string;
          const transport = sseTransport.sse[sessionId];
          if (transport) {
            await transport.handlePostMessage(req, res, req.body);
          } else {
            res.status(400).send('No transport found for sessionId');
          }
        });

        app.listen(SSE_PORT);
        console.error(`SSE server started on http://localhost:${SSE_PORT}/sse`);
        break;

      case "http":
        console.error(`Starting MCP server with StreamableHTTP transport on port ${HTTP_PORT}...`);
        // Map to store transports by session ID
        const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

        // Handle POST requests for client-to-server communication
        app.post('/mcp', async (req, res) => {
          // Check for existing session ID
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          let transport: StreamableHTTPServerTransport;

          if (sessionId && transports[sessionId]) {
            // Reuse existing transport
            transport = transports[sessionId];
          } else if (!sessionId && isInitializeRequest(req.body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId) => {
                // Store the transport by session ID
                transports[sessionId] = transport;
              }
            });

            // Clean up transport when closed
            transport.onclose = () => {
              if (transport.sessionId) {
                delete transports[transport.sessionId];
              }
            };
            // Connect to the MCP server
            // The global 'server' instance (with all tools) will be used here
            await server.connect(transport);
          } else {
            // Invalid request
            res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
              },
              id: null,
            });
            return;
          }

          // Handle the request
          await transport.handleRequest(req, res, req.body);
        });

        // Reusable handler for GET and DELETE requests
        const handleSessionRequest = async (req: express.Request, res: express.Response) => {
          const sessionId = req.headers['mcp-session-id'] as string | undefined;
          if (!sessionId || !transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
          }

          const transport = transports[sessionId];
          await transport.handleRequest(req, res);
        };

        // Handle GET requests for server-to-client notifications via SSE
        // app.get('/mcp', handleSessionRequest);

        // Handle DELETE requests for session termination
        app.delete('/mcp', handleSessionRequest);

        app.listen(HTTP_PORT);
        console.error(`StreamableHTTP server started on http://localhost:${HTTP_PORT}/mcp`);
        break;
      default:
        console.error(`Unknown transport type: ${TRANSPORT_TYPE}`);
        console.error("Available options: stdio, sse, http, streamable, all");
        process.exit(1);
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.error("\nReceived SIGINT, shutting down gracefully...");
  try {
    const server = getServer();
    await server.close();
    console.error("Server closed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  console.error("\nReceived SIGTERM, shutting down gracefully...");
  try {
    const server = getServer();
    await server.close();
    console.error("Server closed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Start the server
startServer();