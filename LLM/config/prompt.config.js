export class Prompt {
  static buildPrompt(d, instruction) {
    return `
You are a professional legal contract drafter.

TASK:
Generate a **Residential PG / Room Rental Agreement** suitable for execution in India.

FORMATTING RULES:
- Use Markdown
- Bold all names, dates, cities, states, and amounts
- Use ## for section headings
- Use ### for clauses
- No placeholders
- No explanations

INPUT DATA:
Owner Name: ${d.owner_name}
Owner Guardian Name: ${d.owner_guardian_name}
Owner Address: ${d.owner_address}

Tenant Name: ${d.tenant_name}
Tenant Guardian Name: ${d.tenant_guardian_name}
Tenant Address: ${d.tenant_address}

PG Name: ${d.pg_name}
PG Address: ${d.pg_full_address}

Room Details: ${d.room_details}
Common Areas: ${d.common_areas}

Agreement City: ${d.agreement_city}
Agreement State: ${d.agreement_state}
Agreement Date: ${d.agreement_date}

Start Date: ${d.start_date}
End Date: ${d.end_date}
Duration: ${d.duration}

Lock-in Period: ${d.lock_in_period}
Notice Period: ${d.notice_period}

Monthly Rent: ${d.rent} (${d.rent_words})
Rent Due Date: ${d.rent_due_day}

Security Deposit: ${d.deposit} (${d.deposit_words})
Deposit Refund Period: ${d.deposit_refund_days}

Late Fee: ${d.late_fee}

Utilities Included: ${d.utilities_included}
Utilities Excluded: ${d.utilities_excluded}

Visitor Hours: ${d.visitor_hours}

Custom Instructions: ${instruction || "None"}

FINAL INSTRUCTION:
Generate a clean, professional, legally formatted agreement in Markdown.
`;
  }

  /* =========================
     UPDATE EXISTING AGREEMENT
  ========================= */
  static updatePrompt(existingAgreement, instruction) {
    return `
You are a professional legal contract drafter.

TASK:
Update the EXISTING Residential PG / Room Rental Agreement (India).

RULES:
- Preserve structure
- Modify ONLY what the instruction requires
- Do NOT explain changes
- Output FULL updated agreement in Markdown

EXISTING AGREEMENT:
${existingAgreement}

USER INSTRUCTION:
${instruction}
`;
  }
}
