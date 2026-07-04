import logging

import asyncpg

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    global _pool
    settings = get_settings()
    logger.info(
        "Connecting to shared marketing Postgres at %s:%s/%s",
        settings.marketing_db_host,
        settings.marketing_db_port,
        settings.marketing_db_name,
    )
    _pool = await asyncpg.create_pool(
        host=settings.marketing_db_host,
        port=settings.marketing_db_port,
        database=settings.marketing_db_name,
        user=settings.marketing_db_user,
        password=settings.marketing_db_password,
        min_size=1,
        max_size=5,
    )


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Marketing DB pool not initialized — did startup run?")
    return _pool
