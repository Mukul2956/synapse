"""
Facebook integration via Facebook Graph API.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.integrations.base import PlatformPublisher

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/v18.0"


class FacebookPublisher(PlatformPublisher):
    platform_name = "facebook"

    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        """
        content keys expected:
            message: str
            link:    str  (optional)
        """
        async with httpx.AsyncClient() as client:
            # Fetch the page ID
            me_resp = await client.get(
                f"{GRAPH_URL}/me",
                params={"access_token": access_token, "fields": "id"},
            )
            me_resp.raise_for_status()
            page_id = me_resp.json().get("id")

            payload: dict[str, Any] = {
                "message": content.get("message", ""),
                "access_token": access_token,
            }
            if content.get("link"):
                payload["link"] = content["link"]

            post_resp = await client.post(
                f"{GRAPH_URL}/{page_id}/feed",
                data=payload,
            )
            post_resp.raise_for_status()
            post_id = post_resp.json()["id"]

        url = f"https://www.facebook.com/{post_id}"
        logger.info("Published Facebook post %s", post_id)
        return {"id": post_id, "url": url}

    async def verify_post(self, access_token: str, post_id: str) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_URL}/{post_id}",
                params={"fields": "id,message", "access_token": access_token},
            )
            return resp.status_code == 200
