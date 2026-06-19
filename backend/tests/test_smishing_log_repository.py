from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.src.backend.models.smishing_log import DetectionType, InputType
from backend.src.backend.repository.smishing_log_repository import (
    create_smishing_log,
)


@pytest.mark.anyio
async def test_create_smishing_log_persists_training_collection_fields() -> None:
    db = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    log = await create_smishing_log(
        db,
        content="배송 주소 오류입니다. <URL>",
        is_smishing=True,
        detection_type=DetectionType.STATIC_PATTERN,
        input_type=InputType.SMS,
        consent_for_training=True,
        static_url_match=True,
    )

    assert log.consent_for_training is True
    assert log.static_url_match is True
    db.add.assert_called_once_with(log)
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once_with(log)
