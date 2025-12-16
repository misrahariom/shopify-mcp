import { Request, Response } from "express";
import { findCustomerByPhone, extractPin } from "../shopify/customerLookup.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("inboundElevenLabs.ts");
export async function elevenLabsInitiationCall(req: Request, res: Response) {
    try {
        logger.info("ElevenLabs Request Body:", req.body);
        const caller = req.body.caller_id;
        const agent_id = req.body.agent_id;
        const enteredData = req.body.pin;
        logger.info("Caller Number is:", caller, "agent_id:", agent_id, "enteredPhoneNumber", enteredData)
        const phoneNumberToSearch = enteredData ?? caller;
        const customer = await findCustomerByPhone(phoneNumberToSearch);
        logger.info("customer data:", customer)

        const agentPrompt = `
                You may converse freely and answer general non-account questions without authentication.

                If the caller asks about an order, delivery status, tracking, returns, cancellations, refunds, account information, or any other restricted details, authentication is required before providing an answer.

                If the customer has not been identified earlier, ask for their registered phone number and use the “get-customers” tool to retrieve their account.

                If the caller provides an incorrect or unmatched phone number, allow up to three attempts. 
                After three failed attempts, inform the caller that you cannot verify their identity and ask them to call back later. 
                Do not provide any restricted information.

                When a phone number is provided, compare it with the phone number stored in the customer record. 
                If the numbers do not match, say:
                "For security reasons, I cannot provide information about this request because the phone number does not match the account owner."
                Do not proceed further or provide any restricted details.

                If the phone numbers match, ask the caller for their PIN. They may enter the PIN using the phone keypad or speak it aloud.

                If the caller speaks the PIN, acknowledge neutrally with a phrase like "Thank you" or "Got it," without repeating or confirming the digits.

                Compare the provided PIN with the stored PIN.
                If the PIN does not match, allow up to three attempts. After three failed attempts, inform the caller that they have reached the limit and must call back later. Do not provide any restricted details.

                If the PIN matches, confirm authentication and proceed.

                After the caller is authenticated, you may fetch and provide restricted details such as order status or account information.

                Before providing any restricted information, always verify that the authenticated phone number matches the phone number associated with the specific order or account being requested.

                If the phone numbers do not match, say:
                "For security reasons, I cannot provide information about this order because the phone number does not match the account owner."
                Do not provide any restricted information and do not continue.
                `;

        // handles null AND undefined AND empty
        if (!customer) {
            const responseBody = {
                type: "conversation_initiation_client_data",
                dynamic_variables: {
                    customer_exists: false,
                    caller
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
                caller
            },

            conversation_config_override: {
                agent: {
                    prompt: {
                        prompt:
                            agentPrompt
                    },
                    first_message: firstMessage
                }
            },

            custom_llm_extra_body: {
            }
        }
        logger.info("ElevenLabs Response:", responseBody);
        return res.status(200).json(responseBody)
    } catch (err) {
        logger.error("Error in inbound webhook", err)
        res.status(500).json({ error: "Internal server error" })
    }
}
