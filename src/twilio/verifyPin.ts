import { Request, Response } from "express";
import { findCustomerByPhone, extractPin } from "../shopify/customerLookup.js";

export async function verifyPin(req: Request, res: Response) {
  const caller = req.body.From;
  const entered = req.body.Digits;

  const customer = await findCustomerByPhone(caller);
  const expected = extractPin(customer);

  if (!expected || entered !== expected) {
    return res.type("text/xml").send(`
      <Response>
        <Say>Incorrect PIN.</Say>
        <Hangup />
      </Response>
    `);
  }

  return res.type("text/xml").send(`
    <Response>
      <Connect>
        <Stream url="wss://api.elevenlabs.io/v1/conv?caller=${encodeURIComponent(
          caller
        )}" />
      </Connect>
    </Response>
  `);
}
