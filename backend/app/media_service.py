from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import CourseVersion, MediaAsset


def published_media_for_version(db: Session, course_version_id: int, step_index: int | None = None) -> list[MediaAsset]:
    statement = select(MediaAsset).join(CourseVersion, CourseVersion.id == MediaAsset.course_version_id).where(MediaAsset.course_version_id == course_version_id, MediaAsset.review_status == "published", CourseVersion.review_status == "published")
    if step_index is not None:
        statement = statement.where(MediaAsset.step_index == step_index)
    assets = list(db.scalars(statement.order_by(MediaAsset.step_index, MediaAsset.id)))
    now = datetime.now(timezone.utc)
    return [asset for asset in assets if asset.license_expires_at is None or asset.license_expires_at.replace(tzinfo=asset.license_expires_at.tzinfo or timezone.utc) > now]
