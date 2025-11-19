import { Request, Response } from "express";
import { findCustomerByPhone,extractPin } from "../shopify/customerLookup.js";
export async function inboundCall(req: Request, res: Response) {
  const caller = req.body.From;
  console.log("req body is::", req.body)
  console.log("caller is::", caller)
  const customer = await findCustomerByPhone(caller);

  if (!customer) {
    return res.type("text/xml").send(`
      <Response>
        <Say>We could not identify you.</Say>
        <Hangup />
      </Response>
    `);
  }

  const pin = extractPin(customer);

  if (!pin) {
    return res.type("text/xml").send(`
      <Response>
        <Say>Hello ${customer.displayName}. Connecting you now.</Say>
        <Connect>
          <Stream url="wss://api.elevenlabs.io/v1/conv" />
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
