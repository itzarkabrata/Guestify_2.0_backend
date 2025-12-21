export class Prompt {
  static buildPrompt(data) {
    const prompt = `
You are generating a PRIVATE ROOM RENTAL AGREEMENT (India).

STRICT RULES:
- This is a draft agreement
- Use simple legal English
- No legal advice
- No invented laws
- Output valid JSON only
- No markdown

CORE AGREEMENT DATA:
Landlord: ${data.landlord_name}
Tenant: ${data.tenant_name}
Property: ${data.property_name}
Address: ${data.address}
Room Type: ${data.room_type}
Rent: INR ${data.rent_amount}
Deposit: INR ${data.deposit_amount}
Lease: ${data.lease_start} to ${data.lease_end}
Notice Period: ${data.notice_period_days} days

OPTIONAL USER INSTRUCTIONS:
${data.custom_instructions || "None"}

JSON FORMAT:
{
  "title": "",
  "clauses": {
    "parties": "",
    "property_details": "",
    "term": "",
    "rent_and_payment": "",
    "security_deposit": "",
    "use_of_property": "",
    "maintenance": "",
    "termination": "",
    "special_clauses": "",
    "general_conditions": ""
  },
  "disclaimer": ""
}
`;

    return prompt;
  }

  static updatePrompt(sessionData, instruction) {
    const updatePrompt = `
You are updating an EXISTING PRIVATE ROOM RENTAL AGREEMENT (India).

RULES:
- Output valid JSON only
- Keep structure
- Modify ONLY what instruction requires
- No markdown

CORE DATA:
${JSON.stringify(sessionData.coreData)}

EXISTING AGREEMENT JSON:
${JSON.stringify(sessionData.agreementJSON)}

USER INSTRUCTION:
${instruction}

Return FULL updated agreement JSON.
`;

    return updatePrompt;
  }
}
