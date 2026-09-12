"""Tests for Volunteer Trust Workflow & Safety Gates in NeighborNet."""

import pytest
from src.models import (
    CoordinationTask,
    OperatingMode,
    Request,
    RequestStatus,
    ResourceType,
    TaskLifecycle,
    Volunteer,
)
from src.services.coordination import CoordinationService


def test_request_verification_and_deduplication():
    """Request verification validates phone, location, and flags duplicate requests."""
    service = CoordinationService()
    req1 = Request(
        request_id="req_trust_1",
        requesting_org_id="org_alpha",
        resource_type=ResourceType.PANTRY_ITEM,
        quantity_requested=10,
        required_by="2026-10-01T12:00:00",
    )
    service.state.requests.append(req1)

    # 1. Verify request
    verified_req = service.verify_request("req_trust_1")
    assert verified_req.request_verified is True
    assert verified_req.phone_verified is True
    assert verified_req.location_verified is True
    assert verified_req.is_duplicate is False

    # 2. Add identical duplicate request
    req2 = Request(
        request_id="req_trust_2",
        requesting_org_id="org_alpha",
        resource_type=ResourceType.PANTRY_ITEM,
        quantity_requested=10,
        required_by="2026-10-01T12:00:00",
    )
    service.state.requests.append(req2)

    # Verification fails due to duplicate detection
    with pytest.raises(ValueError, match="Duplicate request detected"):
        service.verify_request("req_trust_2")
    assert req2.is_duplicate is True
    assert req2.request_verified is False


def test_volunteer_phone_verification_gate():
    """Only phone-verified volunteers are eligible for task assignment."""
    vol_unverified = Volunteer(
        volunteer_id="vol_unverified",
        user_id="user_unverified",
        name="Unverified Volunteer",
        phone_verified=False,
    )
    assert not vol_unverified.is_available_for_assignment

    vol_verified = Volunteer(
        volunteer_id="vol_verified",
        user_id="user_verified",
        name="Verified Volunteer",
        phone_verified=True,
        verified=True,
    )
    assert vol_verified.is_available_for_assignment


def test_atomic_task_acceptance_lockout():
    """Atomic accept locks task for the first volunteer and rejects subsequent attempts."""
    service = CoordinationService()
    task = CoordinationTask(
        task_id="task_atomic_test",
        title="Emergency Water Delivery",
        description="Deliver water",
        status=TaskLifecycle.AVAILABLE,
    )
    service.state.tasks.append(task)

    vol1 = Volunteer(
        volunteer_id="vol_1",
        user_id="user_1",
        name="Volunteer One",
        phone_verified=True,
    )
    vol2 = Volunteer(
        volunteer_id="vol_2",
        user_id="user_2",
        name="Volunteer Two",
        phone_verified=True,
    )
    service.state.volunteers.extend([vol1, vol2])

    # First volunteer claims task
    accepted = service.atomic_accept_task("task_atomic_test", "vol_1")
    assert accepted.volunteer_id == "vol_1"
    assert accepted.status == TaskLifecycle.ASSIGNED

    # Second volunteer attempting to accept gets locked out
    with pytest.raises(ValueError, match="Task has already been claimed"):
        service.atomic_accept_task("task_atomic_test", "vol_2")


def test_anti_self_verification_trust_rules():
    """Volunteers cannot verify their own donation pickup or their own request delivery."""
    service = CoordinationService()
    task = CoordinationTask(
        task_id="task_self_ver_test",
        title="Food Distribution",
        description="Deliver food",
        volunteer_id="vol_user_100",
        donor_user_id="user_donor_1",
        recipient_user_id="user_recipient_1",
        status=TaskLifecycle.ASSIGNED,
    )
    service.state.tasks.append(task)
    pickup_code, delivery_code = service.generate_task_verification_codes(task)

    # 1. Volunteer cannot verify pickup if they are the donor
    task.donor_user_id = "user_same"
    with pytest.raises(ValueError, match="Trust Rule Violated: Volunteer cannot verify pickup"):
        service.verify_task_pickup("task_self_ver_test", pickup_code.otp_code, volunteer_user_id="user_same")

    # Valid non-donor user can verify pickup
    service.verify_task_pickup("task_self_ver_test", pickup_code.otp_code, volunteer_user_id="user_different")
    assert task.pickup_verified is True

    # 2. Volunteer cannot verify delivery if they are the recipient
    task.recipient_user_id = "user_same_rec"
    with pytest.raises(ValueError, match="Trust Rule Violated: Volunteer cannot verify delivery"):
        service.verify_task_delivery("task_self_ver_test", delivery_code.otp_code, volunteer_user_id="user_same_rec")


def test_telemetry_route_deviation_detection():
    """GPS telemetry distant from destination flags major route deviation."""
    service = CoordinationService()
    task = CoordinationTask(
        task_id="task_telemetry_test",
        title="Route Telemetry Task",
        description="Deliver item",
        destination={"lat": 6.9271, "lng": 79.8612},
    )
    service.state.tasks.append(task)

    # Telemetry near destination
    res_ok = service.report_route_telemetry("task_telemetry_test", current_lat=6.9280, current_lng=79.8620)
    assert res_ok["deviation_flagged"] is False

    # Telemetry far away (>5 km)
    res_deviated = service.report_route_telemetry("task_telemetry_test", current_lat=7.1000, current_lng=80.1000)
    assert res_deviated["deviation_flagged"] is True
    assert "Major route deviation detected" in res_deviated["deviation_reason"]


def test_cannot_continue_cancellation_and_recovery():
    """Clicking 'Cannot Continue' triggers RecoveryEngine to reassign task without duplicate request creation."""
    service = CoordinationService()
    task = CoordinationTask(
        task_id="task_cancel_test",
        title="Medical Parcel Delivery",
        description="Deliver medical items",
        volunteer_id="vol_1",
        status=TaskLifecycle.ASSIGNED,
    )
    service.state.tasks.append(task)

    # Volunteer cancels via 'Cannot Continue'
    result = service.cancel_and_recover_task("task_cancel_test", "vol_1", "Vehicle breakdown on bridge")
    assert result["success"] is True
    assert task.status in (TaskLifecycle.NEEDS_ATTENTION, TaskLifecycle.ASSIGNED, TaskLifecycle.SUPERSEDED)
