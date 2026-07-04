from enum import Enum

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
    email_address: EmailStr
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


class BookingRequest(BaseModel):
    slot: BookingSlotSelection
    customer: CustomerContact
    note: str | None = Field(default=None, max_length=500)
    sms_opt_in: bool = False


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


class FourHandRequestSubmission(BaseModel):
    customer: CustomerContact
    requested_services: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=500)


class FourHandRequestConfirmation(BaseModel):
    booking_id: str
    status: str
    service_name: str
    message: str
