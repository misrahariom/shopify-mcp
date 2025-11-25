import { Request, Response } from "express";
import { findCustomerByPhone,extractPin } from "../shopify/customerLookup.js";
import { getSession, updateSession } from "../utils/sessionStore.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("inbound.ts");

export async function inboundCall(req: Request, res: Response) {
    logger.info("request", req);
    const caller = req.body.From;
    const callSid = req.body.CallSid;
    const enteredPhoneNumber = req.body.Digits;
    logger.info("Caller Number is:", caller, "Entered phone Number:", enteredPhoneNumber)
    const phoneNumberToSearch= enteredPhoneNumber ?? caller;
      // Start or reset attempts
    const session = getSession(callSid);
    session.attempts = 0;
    updateSession(callSid, session);
    const customer = await findCustomerByPhone(phoneNumberToSearch);
    if (!customer) {
        return res.type("text/xml").send(`
        <Response>
            <Gather input="dtmf" finishOnKey="#" action="/twilio/inbound">
                  <Say>Sorry, We could not identify you. Please enter you registered mobile number.</Say>
            </Gather>
        </Response>
        `);
    }

      // Save data in the session
    updateSession(callSid, {
        customerId: customer.id,
        customerName: customer.displayName,
        registeredPhone: caller,
        stage: "awaiting_pin"
    });


    const pin = extractPin(customer);
    const agent_id = process.env.AGENT_ID || "";
    const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";
    const requestQuery =
    enteredPhoneNumber != null
        ? `?registeredPhone=${encodeURIComponent(enteredPhoneNumber)}`
        : "";

    // if (!pin) {
    //     return res.type("text/xml").send(`
    //     <Response>
    //         <Say>Hello ${customer.displayName}. Pin is authenticated. Connecting you now.</Say>
    //         <Connect>
    //         <Stream url="wss://${wss_endpoint}/media-stream-eleven?agent_id=${agent_id}" />
    //         </Connect>
    //     </Response>
    //     `);
    // }

    return res.type("text/xml").send(`
        <Response>
        <Gather input="dtmf" numDigits="${pin.length}" finishOnKey="#" action="/twilio/verify-pin${requestQuery}">
            <Say>Hello ${customer.displayName}. Enter your ${pin.length} digit PIN.</Say>
        </Gather>
        </Response>
    `);
}
