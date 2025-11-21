import { Request, Response } from "express";
import { findCustomerByPhone, extractPin } from "../shopify/customerLookup.js";

export async function verifyPin(req: Request, res: Response) {
    const caller = req.body.From;
    const entered = req.body.Digits;
    const customer = await findCustomerByPhone(caller);
    const expected = extractPin(customer);
    console.log("Pin:expected::", expected, ":entered:",entered)
    const agent_id = process.env.AGENT_ID || "";
    const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";
    const apiKey = encodeURIComponent(process.env.ELEVENLABS_API_KEY || "");

    if (!expected || entered !== expected) {
        return res.type("text/xml").send(`
        <Response>
            <Say>PIN is not correct. Please re-enter your ${expected.length} digit PIN.</Say>
            <Gather input="dtmf" numDigits="${expected.length}" action="/twilio/verify-pin">
            </Gather>
            <Hangup />
        </Response>
        `);
    }

    // WSS stream url
    const streamUrl =`wss://${wss_endpoint}/media-stream-eleven?agent_id=${agent_id}` ;
    console.log("Final Stream URL:", streamUrl);
    const twiml = `
    <Response>
    <Say>Hello ${customer.displayName}. Pin is authenticated. Connecting you to AI Agent now.</Say>
    <Pause length="1"/>
    <Connect>
        <Stream url="${streamUrl}" />
    </Connect>
    </Response>
    `;
    return res.type("text/xml").send(twiml);
}
