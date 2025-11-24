import { Request, Response } from "express";
import { findCustomerByPhone, extractPin } from "../shopify/customerLookup.js";
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

            const agentPrompt = `
            Ask the caller for their registered phone number.
            When they share it, search for the customer using the "get-customers" tool.
            If you find a customer, ask for their PIN.
            Compare the PIN with the stored PIN in the tool response.
            If it matches, confirm authentication and continue with the caller’s request.
            If the PIN is wrong, allow up to three attempts.
            If all attempts fail, tell the caller they reached the limit and they should hang up and call again.
            `;


            const responseBody = {
                type: "conversation_initiation_client_data",
                dynamic_variables: {
                    customer_exists: false,
                    caller,
                    call_sid: callSid
                },

                conversation_config_override: {
                    agent: {
                        prompt: {
                            prompt: agentPrompt
                    },
                        first_message: "Hi there, How may I help you today?"
                    }
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

        const displayName =
            customer?.displayName && customer.displayName.trim().length > 0
                ? customer.displayName
                : "there"

        const firstMessage = `Hi ${displayName}, How can I help you today?`
        const instruction = `Ask the caller for the PIN before any action. Compare the entered PIN with the provided PIN which is ${pin}. If it matches, confirm the match to the caller and ask for their query. If it does not match, ask again. Allow three attempts. If the caller fails three times, tell them they have exceeded the limit and ask them to end the call and call again if needed.`;

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
                agent: {
                    prompt: {
                        prompt:
                            instruction
                    },
                    first_message: firstMessage
                }
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
