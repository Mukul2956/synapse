"""
Reddit integration via PRAW (Python Reddit API Wrapper).

Supports text posts and link posts to a given subreddit.
Requires script-type app credentials from https://www.reddit.com/prefs/apps
"""

from __future__ import annotations

import logging
from typing import Any

import praw  # type: ignore

from app.config import settings
from app.integrations.base import PlatformPublisher

logger = logging.getLogger(__name__)


class RedditPublisher(PlatformPublisher):
    platform_name = "reddit"

    def _client(self) -> praw.Reddit:
        return praw.Reddit(
            client_id=settings.REDDIT_CLIENT_ID,
            client_secret=settings.REDDIT_CLIENT_SECRET,
            username=settings.REDDIT_USERNAME,
            password=settings.REDDIT_PASSWORD,
            user_agent=settings.REDDIT_USER_AGENT,
        )

    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        """
        content keys expected:
            title     : str   – post title (required, max 300 chars)
            text      : str   – self-text body (optional for text posts)
            subreddit : str   – target subreddit name without r/ (default: "test")
            url       : str   – link URL for link posts (optional)
        """
        title = content.get("title", content.get("text", "")[:300])
        subreddit_name = content.get("subreddit", "test")
        url = content.get("url")
        text = content.get("text", "")[:40000]

        # PRAW is synchronous; run in a thread-pool-friendly way
        import asyncio

        def _submit() -> dict:
            reddit = self._client()
            subreddit = reddit.subreddit(subreddit_name)
            if url:
                submission = subreddit.submit(title=title[:300], url=url)
            else:
                submission = subreddit.submit(title=title[:300], selftext=text)
            return {
                "id": submission.id,
                "url": f"https://www.reddit.com{submission.permalink}",
            }

        result = await asyncio.to_thread(_submit)
        logger.info("Published Reddit post %s to r/%s", result["id"], subreddit_name)
        return result

    async def verify_post(self, access_token: str, post_id: str) -> bool:
        import asyncio

        def _check() -> bool:
            try:
                reddit = self._client()
                submission = reddit.submission(id=post_id)
                return not submission.removed_by_category
            except Exception:
                return False

        return await asyncio.to_thread(_check)
