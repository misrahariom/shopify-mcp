import { Request, Response } from "express";
import { findCustomerByPhone,extractPin } from "../shopify/customerLookup.js";
export async function inboundCall(req: Request, res: Response) {
    const caller = req.body.From;
    const enteredPhoneNumber = req.body.Digits;
    console.log("Caller Number is:", caller, "Entered phone Number:", enteredPhoneNumber)
    const phoneNumberToSearch= enteredPhoneNumber ?? caller;
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

    const pin = extractPin(customer);
    const agent_id = process.env.AGENT_ID || "";
    const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";


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
        <Gather input="dtmf" numDigits="${pin.length}" finishOnKey="#" action="/twilio/verify-pin?registeredPhone=${enteredPhoneNumber}">
            <Say>Hello ${customer.displayName}. Enter your ${pin.length} digit PIN.</Say>
        </Gather>
        </Response>
    `);
}
