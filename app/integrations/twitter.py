"""
Twitter / X integration via Tweepy v4.
"""

from __future__ import annotations

import logging
from typing import Any

import tweepy  # type: ignore

from app.config import settings
from app.integrations.base import PlatformPublisher

logger = logging.getLogger(__name__)


class TwitterPublisher(PlatformPublisher):
    platform_name = "twitter"

    def _client(self, access_token: str, access_secret: str = "") -> tweepy.Client:
        return tweepy.Client(
            consumer_key=settings.TWITTER_API_KEY,
            consumer_secret=settings.TWITTER_API_SECRET,
            access_token=access_token,
            access_token_secret=access_secret or settings.TWITTER_ACCESS_SECRET,
        )

    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        """
        content keys expected:
            text: str           (max 280 chars)
            media: list[str]    (optional, up to 4 URLs)
        """
        try:
            client = self._client(access_token)
            text = content.get("text", "")[:280]
            response = client.create_tweet(text=text)
            tweet_id = response.data["id"]
            tweet_url = f"https://twitter.com/i/web/status/{tweet_id}"
            logger.info("Published tweet %s", tweet_id)
            return {"id": tweet_id, "url": tweet_url}
        except tweepy.TweepyException as exc:
            logger.error("Twitter publish failed: %s", exc)
            raise

    async def verify_post(self, access_token: str, post_id: str) -> bool:
        try:
            client = self._client(access_token)
            resp = client.get_tweet(post_id)
            return bool(resp.data)
        except Exception:
            return False
