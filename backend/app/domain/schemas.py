from enum import Enum
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class ArtistTier(str, Enum):
    TOP = "top"
    REGULAR = "regular"


class TierPricing(BaseModel):
    tier: ArtistTier
    variation_id: str
    variation_version: int
    price: float
    compare_at_price: float | None = None
    duration_minutes: int
    team_member_ids: list[str]


class ServiceOffer(BaseModel):
    slug: str
    name: str
    offer_label: str | None = None
    description: str | None = None
    is_first_time_offer: bool = False
    pricing: list[TierPricing]

    @property
    def lowest_price(self) -> float:
        return min(p.price for p in self.pricing)

    @property
    def advertised_price(self) -> float:
        # The price shown as the hero offer price is always the top-tier price —
        # customers who match to the cheaper tier automatically see savings.
        top = next((p for p in self.pricing if p.tier == ArtistTier.TOP), self.pricing[0])
        return top.price

    @property
    def advertised_compare_at_price(self) -> float | None:
        top = next((p for p in self.pricing if p.tier == ArtistTier.TOP), self.pricing[0])
        return top.compare_at_price


class FlatAddon(BaseModel):
    """A single-price add-on layered onto a tiered service (e.g. nail art design)."""

    slug: str
    name: str
    description: str | None = None
    price: float
    duration_minutes: int
    variation_id: str
    variation_version: int
    team_member_ids: list[str]
    requires_slug: str


class FourHandRequestInfo(BaseModel):
    slug: str
    name: str
    description: str
    price_description: str | None = None


class CartMenu(BaseModel):
    """Everything the "Customize your visit" step needs: the primary service,
    the services that can be added alongside it, flat add-ons, and the
    lead-capture-only 4-hand path.
    """

    manicure: ServiceOffer
    pedicure: ServiceOffer
    design_addon: FlatAddon
    four_hand_request: FourHandRequestInfo


class Artist(BaseModel):
    id: str
    display_name: str
    tier: ArtistTier
    bio: str | None = None
    photo_url: str | None = None


class SegmentOption(BaseModel):
    """One service within a (possibly multi-service) appointment slot."""

    service_slug: str
    name: str
    variation_id: str
    variation_version: int
    price: float
    compare_at_price: float | None = None
    duration_minutes: int


class SlotOption(BaseModel):
    start_at: str
    end_at: str
    duration_minutes: int
    team_member_id: str
    artist_name: str | None = None
    tier: ArtistTier
    price: float
    compare_at_price: float | None = None
    advertised_price: float
    savings: float = Field(description="advertised_price - price, floored at 0")
    is_best_price: bool = False
    segments: list[SegmentOption]


class AvailabilityResponse(BaseModel):
    services: list[str]
    artist_selection: str  # "any" or a team_member_id
    slots: list[SlotOption]


class CustomerContact(BaseModel):
    given_name: str = Field(min_length=1, max_length=100)
    family_name: str = Field(min_length=1, max_length=100)
    email_address: EmailStr | None = None
    phone_number: str = Field(min_length=7, max_length=20)
    marketing_opt_in: bool = False


class BookingSegmentSelection(BaseModel):
    service_slug: str
    service_variation_id: str
    service_variation_version: int


class BookingSlotSelection(BaseModel):
    start_at: str
    team_member_id: str
    segments: list[BookingSegmentSelection]


class TrackingSnapshot(BaseModel):
    """Client-captured attribution data — first-touch UTM/referrer/landing
    page, correlated across visit and submission by a client-generated
    visitor_id. Device/OS/browser are derived server-side from the request's
    User-Agent header instead, since that's the more reliable source.
    """

    visitor_id: str = Field(max_length=64)
    landing_path: str | None = Field(default=None, max_length=500)
    referrer: str | None = Field(default=None, max_length=1000)
    utm_source: str | None = Field(default=None, max_length=200)
    utm_medium: str | None = Field(default=None, max_length=200)
    utm_campaign: str | None = Field(default=None, max_length=200)
    utm_term: str | None = Field(default=None, max_length=200)
    utm_content: str | None = Field(default=None, max_length=200)
    fbclid: str | None = Field(default=None, max_length=500)
    gclid: str | None = Field(default=None, max_length=500)
    landing_page_id: str | None = Field(default=None, max_length=64)
    variant_id: str | None = Field(default=None, max_length=64)


class VisitRecordedResponse(BaseModel):
    visitor_id: str


class TrackingEvent(BaseModel):
    """A funnel event for the experimentation system — distinct from `TrackingSnapshot`,
    which drives the general visits/submissions log. Always carries a session_id (the same
    client-generated visitor_id) so events can be correlated per visitor.
    """

    session_id: str = Field(max_length=64)
    landing_page_id: str | None = None
    variant_id: str | None = None
    event_type: Literal["page_view", "click", "booking_started", "booking_completed"]
    metadata: dict = Field(default_factory=dict)


class EventRecordedResponse(BaseModel):
    recorded: bool


class BookingFunnelStepEvent(BaseModel):
    """One step-reached event within a booking flow — see marketing.funnel_events.

    Distinct from `TrackingEvent` (page_view/click/booking_started/booking_completed): this
    tracks progress *through* the booking modal's own steps, which differ in count and order
    between landing pages (mani asks for contact info at step 1; akluxnails-home's homepage asks
    last). `flow_key` identifies which flow definition produced the event; `step_index`/
    `step_count_total` let differently-shaped flows be compared by relative position rather than
    by step name.
    """

    session_id: str = Field(max_length=64)
    landing_page_id: str | None = None
    variant_id: str | None = None
    flow_key: str = Field(max_length=64)
    step_key: str = Field(max_length=64)
    step_index: int = Field(ge=0)
    step_count_total: int = Field(ge=1)
    metadata: dict = Field(default_factory=dict)


class BookingRequest(BaseModel):
    slot: BookingSlotSelection
    customer: CustomerContact
    note: str | None = Field(default=None, max_length=500)
    sms_opt_in: bool = False
    tracking: TrackingSnapshot | None = None
    # Abuse-guard fields — see app.services.abuse_guard. All optional so older/cached frontend
    # bundles without them still submit successfully; a missing honeypot/timestamp just skips
    # that specific check rather than failing the request.
    website: str | None = None  # honeypot — real users never see or fill this field
    form_rendered_at: str | None = None  # ISO timestamp, set client-side when the form appeared
    turnstile_token: str | None = None


class BookingConfirmation(BaseModel):
    booking_id: str
    status: str
    start_at: str
    duration_minutes: int
    service_name: str
    tier: ArtistTier
    artist_name: str | None
    price: float
    compare_at_price: float | None
    location_name: str
    location_address: str
    location_phone: str | None
    cancellation_policy_text: str | None
    # Internal-only (excluded from the API response): lets the route layer link this booking
    # to the local contacts record without exposing Square's internal id to the frontend.
    square_customer_id: str = Field(exclude=True)


class FourHandRequestSubmission(BaseModel):
    customer: CustomerContact
    requested_services: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=500)
    tracking: TrackingSnapshot | None = None
    # Abuse-guard fields — see BookingRequest for why these are all optional.
    website: str | None = None
    form_rendered_at: str | None = None
    turnstile_token: str | None = None


class FourHandRequestConfirmation(BaseModel):
    booking_id: str
    status: str
    service_name: str
    message: str
    # Internal-only, see BookingConfirmation.square_customer_id.
    square_customer_id: str = Field(exclude=True)


class ContactCaptureRequest(BaseModel):
    """Fired when Step 1 (name + phone, email optional) is submitted — before a real Square
    booking (and thus a Square customer) exists.
    """

    given_name: str = Field(min_length=1, max_length=100)
    phone_number: str = Field(min_length=7, max_length=20)
    email_address: EmailStr | None = None
    tracking: TrackingSnapshot | None = None


class ContactCaptureResponse(BaseModel):
    recorded: bool
