import { Request, Response } from "express";
import { findCustomerByPhone, extractPin } from "../shopify/customerLookup.js";
import { logger } from "../utils/logger.js";

export async function verifyPin(req: Request, res: Response) {
    const caller = req.body.From;
    const entered = req.body.Digits;
    const registeredPhone = req.query.registeredPhone;
    logger.info("Caller Number is:", caller, "Registered phone Number:", registeredPhone)
    const phoneNumberToSearch=  registeredPhone ?? caller;
    const customer = await findCustomerByPhone(phoneNumberToSearch);
    const expected = extractPin(customer);
    logger.info("Pin Expected:", expected, "Entered:",entered)
    const agent_id = process.env.AGENT_ID || "";
    const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";
    const apiKey = encodeURIComponent(process.env.ELEVENLABS_API_KEY || "");

    if (!expected || entered !== expected) {
        return res.type("text/xml").send(`
        <Response>
            <Say>PIN is not correct. Please re-enter your ${expected.length} digit PIN.</Say>
            <Gather input="dtmf" numDigits="${expected.length}" finishOnKey="#" action="/twilio/verify-pin?registeredPhone=${phoneNumberToSearch}">
            </Gather>
            <Hangup />
        </Response>
        `);
    }

    // WSS stream url
    const streamUrl =`wss://${wss_endpoint}/media-stream-eleven?agent_id=${agent_id}` ;
    logger.info("Final Stream URL:", streamUrl);
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
