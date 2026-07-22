import logging

from square import Square
from square.types.team_member import TeamMember

from app.core.cache import TTLCache
from app.integrations.square.errors import SQUARE_CALL_ERRORS, square_error_detail
from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)


class SquareTeamRepository:
    """Read access to active Square team members for the configured location."""

    def __init__(self, client: Square, location_id: str, cache_ttl_seconds: float):
        self._client = client
        self._location_id = location_id
        self._cache: TTLCache[dict[str, TeamMember]] = TTLCache(cache_ttl_seconds)

    def _fetch_team_members(self) -> dict[str, TeamMember]:
        logger.info("Fetching Square team members for location %s", self._location_id)
        try:
            response = self._client.team_members.search(
                query={"filter": {"location_ids": [self._location_id], "status": "ACTIVE"}}
            )
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error("Square team member search failed: %s", detail if detail is not None else exc)
            raise SquareIntegrationError("Unable to load artists from Square", detail=detail) from exc

        return {member.id: member for member in (response.team_members or [])}

    def get_team_member(self, team_member_id: str) -> TeamMember | None:
        members = self._cache.get_or_fetch(self._fetch_team_members)
        return members.get(team_member_id)

    def all_team_members(self) -> dict[str, TeamMember]:
        return self._cache.get_or_fetch(self._fetch_team_members)
