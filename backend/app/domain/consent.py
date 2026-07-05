"""Versioned marketing consent language.

Server-controlled rather than client-supplied, so the audit trail always reflects exactly
what was shown, tied to a stable version tag — if the wording on the booking form ever
changes, bump the version so old consent events stay correctly attributed to what the
customer actually saw at the time.
"""

SMS_CONSENT_VERSION = "booking_form_v1"
SMS_CONSENT_TEXT = "Text me reminders & exclusive offers"

# Email marketing consent is granted automatically on every booking, independent of the SMS
# checkbox above — there's no separate email opt-in checkbox on the form. Recorded honestly
# as implied consent from the transaction (not as if the customer was shown explicit wording),
# consistent with CAN-SPAM's lighter bar for an existing customer relationship (vs. TCPA's
# prior-express-consent requirement for SMS). Revisit if a real opt-out control is ever added.
EMAIL_CONSENT_VERSION = "booking_form_v1"
EMAIL_CONSENT_TEXT = "Implied consent: customer provided their email address to complete a booking; no separate opt-in checkbox shown. Independent of the SMS marketing choice."
