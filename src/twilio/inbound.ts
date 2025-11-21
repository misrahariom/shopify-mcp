import { Request, Response } from "express";
import { findCustomerByPhone,extractPin } from "../shopify/customerLookup.js";
export async function inboundCall(req: Request, res: Response) {
    const caller = req.body.From;
    console.log("caller is::", caller)
    const customer = await findCustomerByPhone(caller);

    if (!customer) {
        return res.type("text/xml").send(`
        <Response>
            <Say>Sorry, We could not identify you. Please call from registered mobile number</Say>
            <Hangup />
        </Response>
        `);
    }

    const pin = extractPin(customer);
    const agent_id = process.env.AGENT_ID || "";
    const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";


    if (!pin) {
        return res.type("text/xml").send(`
        <Response>
            <Say>Hello ${customer.displayName}. Pin is authenticated. Connecting you now.</Say>
            <Connect>
            <Stream url="wss://${wss_endpoint}/media-stream-eleven?agent_id=${agent_id}" />
            </Connect>
        </Response>
        `);
    }

    return res.type("text/xml").send(`
        <Response>
        <Gather input="dtmf" numDigits="${pin.length}" action="/twilio/verify-pin">
            <Say>Hello ${customer.displayName}. Enter your ${pin.length} digit PIN.</Say>
        </Gather>
        </Response>
    `);
}
