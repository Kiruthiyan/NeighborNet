"""Regression test for a startup-crashing bug found while manually testing
the running app: `Request.required_by` used to be validated as "must be in
the future" as a pydantic model validator, which re-ran every time an old
request was rehydrated from storage on startup - not just at creation. The
moment any persisted request's deadline naturally passed (normal lifecycle,
not corrupt data), `CoordinationService.__init__` raised and every endpoint,
including login, started failing with a 500.

The fix: only enforce "must be in the future" at creation time
(CoordinationService.create_request), never as a standing model invariant.
"""

from datetime import datetime, timedelta

import pytest

from src.models import Request, ResourceType, User
from src.services.coordination import CoordinationService


class TestRequestRehydrationSafety:
    def test_loading_an_overdue_request_does_not_raise(self):
        """A Request whose required_by is already in the past must still
        construct/validate cleanly - this is what model_validate() does for
        every row loaded from DynamoDB on startup."""

        overdue = Request(
            requesting_org_id="org_test",
            resource_type=ResourceType.PANTRY_ITEM,
            quantity_requested=10,
            required_by=datetime.now() - timedelta(days=1),
        )
        assert overdue.is_overdue is True

    def test_creating_a_new_request_with_past_required_by_is_still_rejected(self):
        """The business rule isn't gone - it's just enforced at creation
        time instead of as a load-time invariant."""

        service = CoordinationService()
        service.reset()
        requester = User(name="Test Requester", email="req@example.com")

        with pytest.raises(ValueError, match="required_by must be in the future"):
            service.create_request(
                {
                    "quantity_requested": 5,
                    "resource_type": "pantry_item",
                    "required_by": (datetime.now() - timedelta(hours=1)).isoformat(),
                },
                requester,
            )

    def test_creating_a_new_request_with_future_required_by_succeeds(self):
        service = CoordinationService()
        service.reset()
        requester = User(name="Test Requester", email="req2@example.com")

        request = service.create_request(
            {
                "quantity_requested": 5,
                "resource_type": "pantry_item",
                "required_by": (datetime.now() + timedelta(days=2)).isoformat(),
            },
            requester,
        )
        assert request.required_by > datetime.now()
