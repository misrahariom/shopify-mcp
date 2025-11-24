import { Request, Response } from "express";
import { findCustomerByPhone,extractPin } from "../shopify/customerLookup.js";
import { logger } from "../utils/logger.js";
import { getSession, updateSession } from "../utils/sessionStore.js";

export async function elevenLabsInitiationCall(req: Request, res: Response) {
    try {
        logger.info("ElevenLabs Request Body:", req.body);
        const caller = req.body.caller_id;
        const callSid = req.body.call_sid;
        const agent_id = req.body.agent_id;
        const enteredPhoneNumber = req.body.pin;
        logger.info("Caller Number is:", caller, "agent_id:", agent_id)
        const phoneNumberToSearch = enteredPhoneNumber ?? caller;
        // Start or reset attempts
        const session = getSession(callSid);
        session.attempts = 0;
        updateSession(callSid, session);
        const customer = await findCustomerByPhone(phoneNumberToSearch);
        logger.info("customer data:", customer)

        // handles null AND undefined AND empty
        if (!customer) {
            
        const responseBody = {
           type: "conversation_initiation_client_data",
            dynamic_variables: {
            customer_exists: false,
            caller,
            call_sid: callSid
            },

            conversation_config_override: {
                // agent: {
                //     prompt: {
                //         prompt: "No customer record exists for this caller. Speak generically."
                //     },
                // // first_message: "Hi, how may I help you today?"
                // }
            }
        };
        logger.info("ElevenLabs Response:", responseBody);
        return res.status(200).json(responseBody);
        }

        // Save data in the session
        updateSession(callSid, {
            customerId: customer?.id,
            customerName: customer?.displayName,
            registeredPhone: caller,
            stage: "awaiting_pin"
        });

        const pin = extractPin(customer);
        const wss_endpoint = process.env.WSS_ENDPOINT || "many-jars-make.loca.lt";
        const requestQuery =
            enteredPhoneNumber != null
                ? `?registeredPhone=${encodeURIComponent(enteredPhoneNumber)}`
                : "";

        const responseBody = {
            type: "conversation_initiation_client_data",
            dynamic_variables: {
                customer_name: customer.displayName,
                customerId: customer.id,
                pin: pin,
                caller,
                call_sid: callSid
            },

            conversation_config_override: {
                // agent: {
                //     prompt: {
                //         prompt:
                //             "Please confirm if customers PIN. If not, request it again."
                //     },
                //    // first_message: "Hi ${customer.displayName}, how can I help you today?"
                // }
            },

            custom_llm_extra_body: {
                //temperature: 0.4,
                //max_tokens: 1200
            }
        }
        logger.info("ElevenLabs Response:", responseBody);
        return res.status(200).json(responseBody)
    } catch (err) {
        logger.error("Error in inbound webhook", err)
        res.status(500).json({ error: "Internal server error" })
    }
}
