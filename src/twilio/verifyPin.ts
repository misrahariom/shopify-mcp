import { Request, Response } from "express";
import { findCustomerByPhone, extractPin } from "../shopify/customerLookup.js";
import { createLogger } from "../utils/logger.js";
import { getSession, updateSession, clearSession } from "../utils/sessionStore.js";

const MAX_ATTEMPTS = 3;
const logger = createLogger("verifyPin.ts");
export async function verifyPin(req: Request, res: Response) {
    const caller = req.body.From;
    const enteredPin = req.body.Digits;
    const registeredPhone = req.query.registeredPhone;
    logger.info("Caller Number is:", caller, "Registered phone Number:", registeredPhone)
    const phoneNumberToSearch=  registeredPhone ?? caller;
    const customer = await findCustomerByPhone(phoneNumberToSearch);
    const expectedPin = extractPin(customer);
    logger.info("Expected Pin:", expectedPin, "Entered Pin:",enteredPin)
    const agent_id = process.env.AGENT_ID || "";
    const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";
    const apiKey = encodeURIComponent(process.env.ELEVENLABS_API_KEY || "");

    const requestQuery =
    phoneNumberToSearch != null
        ? `?registeredPhone=${encodeURIComponent(phoneNumberToSearch)}`
        : "";
    // get session    
    const callSid = req.body.CallSid;
    const session = getSession(callSid);
    session.attempts += 1;
    // Exceeded attempts?
    if (session.attempts >= MAX_ATTEMPTS) {
        clearSession(callSid);
        return res.type("text/xml").send(`
        <Response>
            <Say>You have exceeded maximum attempts. Goodbye.</Say>
            <Hangup/>
        </Response>
        `.trim());
    }
    if (!expectedPin || enteredPin !== expectedPin) {
        const remainingAttempt = MAX_ATTEMPTS - session.attempts;
        logger.info("remaining attempts", remainingAttempt)
        return res.type("text/xml").send(`
        <Response>
            <Say>PIN is not correct. You have ${remainingAttempt} attempts left. Please re-enter your ${expectedPin.length} digit PIN.</Say>
            <Gather input="dtmf" numDigits="${expectedPin.length}" finishOnKey="#" action="/twilio/verify-pin${requestQuery}">
            </Gather>
            <Hangup />
        </Response>
        `);
    }

    
    // Success!
    updateSession(callSid, { stage: "verified" });

    logger.info("PIN verified for:", session.customerId, session.customerName);

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
