"""Versioned SMS marketing consent language.

Server-controlled rather than client-supplied, so the audit trail always reflects exactly
what was shown, tied to a stable version tag — if the wording on the booking form ever
changes, bump the version so old consent events stay correctly attributed to what the
customer actually saw at the time.
"""

SMS_CONSENT_VERSION = "booking_form_v1"
SMS_CONSENT_TEXT = "Text me reminders & exclusive offers"
