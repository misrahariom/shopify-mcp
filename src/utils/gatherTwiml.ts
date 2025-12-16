export function buildGatherResponse(options: {
  message: string;
  action: string;
  numDigits?: number;
  finishOnKey?: string;
}) {
  const { message, action, numDigits, finishOnKey = "#" } = options;

  const maybeNumDigits = numDigits ? `numDigits="${numDigits}"` : "";
  
  return `
    <Response>
      <Gather input="dtmf" ${maybeNumDigits} finishOnKey="${finishOnKey}" 
        speechModel="googlev2_long" 
        action="${action}">
        <Say>${message}</Say>
      </Gather>
    </Response>
  `.trim();
}
