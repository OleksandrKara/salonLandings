from app.domain.schemas import Artist, ArtistTier, ServiceOffer
from app.integrations.square.team import SquareTeamRepository


class ArtistNotFoundError(Exception):
    pass


# Optional local overlay for marketing copy Square has no field for.
# Falls back gracefully to just the Square-registered name when absent.
_ARTIST_BIO_OVERLAY: dict[str, dict[str, str]] = {}


class ArtistService:
    """Derives the public artist list (and tiers) from which service-variation
    each Square team member is assigned to — Square itself has no "tier" field.
    """

    def __init__(self, team_repo: SquareTeamRepository):
        self._team_repo = team_repo

    def list_artists(self, service_offers: list[ServiceOffer]) -> list[Artist]:
        tier_by_member_id = self._tier_by_member_id(service_offers)
        members = self._team_repo.all_team_members()

        artists: list[Artist] = []
        for member_id, tier in tier_by_member_id.items():
            member = members.get(member_id)
            if member is None:
                continue
            overlay = _ARTIST_BIO_OVERLAY.get(member_id, {})
            family_initial = f" {member.family_name[0]}." if member.family_name else ""
            artists.append(
                Artist(
                    id=member_id,
                    display_name=f"{member.given_name or 'Artist'}{family_initial}",
                    tier=tier,
                    bio=overlay.get("bio"),
                    photo_url=overlay.get("photo_url"),
                )
            )

        artists.sort(key=lambda a: (a.tier != ArtistTier.TOP, a.display_name))
        return artists

    def get_artist(self, member_id: str, service_offers: list[ServiceOffer]) -> Artist:
        artists = self.list_artists(service_offers)
        artist = next((a for a in artists if a.id == member_id), None)
        if artist is None:
            raise ArtistNotFoundError(f"Unknown artist '{member_id}'")
        return artist

    @staticmethod
    def _tier_by_member_id(service_offers: list[ServiceOffer]) -> dict[str, ArtistTier]:
        tiers: dict[str, ArtistTier] = {}
        for offer in service_offers:
            for tier_pricing in offer.pricing:
                for member_id in tier_pricing.team_member_ids:
                    # A member already known as TOP stays TOP even if also listed
                    # on a regular-tier variation elsewhere.
                    if tiers.get(member_id) != ArtistTier.TOP:
                        tiers[member_id] = tier_pricing.tier
        return tiers
