"""
Instagram integration via Facebook Graph API (Instagram Graph API).

Note: Requires a Facebook *Business* account connected to an Instagram
Professional account.  The `access_token` is a Page/User access token.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.integrations.base import PlatformPublisher

logger = logging.getLogger(__name__)

GRAPH_URL = "https://graph.facebook.com/v18.0"


class InstagramPublisher(PlatformPublisher):
    platform_name = "instagram"

    async def publish(self, access_token: str, content: dict[str, Any]) -> dict[str, Any]:
        """
        content keys expected:
            caption:   str
            image_url: str   (publicly accessible URL to the image)
        """
        image_url = content.get("image_url")
        caption = content.get("caption", "")

        if not image_url:
            raise ValueError("Instagram requires image_url in content dict")

        async with httpx.AsyncClient() as client:
            # Step 1 – create media container
            container_resp = await client.post(
                f"{GRAPH_URL}/me/media",
                params={
                    "image_url": image_url,
                    "caption": caption,
                    "access_token": access_token,
                },
            )
            container_resp.raise_for_status()
            container_id = container_resp.json()["id"]

            # Step 2 – publish the container
            publish_resp = await client.post(
                f"{GRAPH_URL}/me/media_publish",
                params={
                    "creation_id": container_id,
                    "access_token": access_token,
                },
            )
            publish_resp.raise_for_status()
            post_id = publish_resp.json()["id"]

        url = f"https://www.instagram.com/p/{post_id}/"
        logger.info("Published Instagram post %s", post_id)
        return {"id": post_id, "url": url}

    async def verify_post(self, access_token: str, post_id: str) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_URL}/{post_id}",
                params={"fields": "id,timestamp", "access_token": access_token},
            )
            return resp.status_code == 200
