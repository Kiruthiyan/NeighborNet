"""Tests for OTP/QR Verification System in NeighborNet."""

from datetime import datetime, timedelta, timezone
import pytest
from src.models import (
    CoordinationTask,
    OperatingMode,
    TaskLifecycle,
    TaskVerificationCode,
    VerificationCodeType,
    VerificationStatus,
)
from src.services.coordination import CoordinationService


def test_verification_code_model():
    """TaskVerificationCode correctly auto-generates OTP and QR payload and tracks validity."""
    code = TaskVerificationCode(
        task_id="task_100",
        code_type=VerificationCodeType.PICKUP,
    )
    assert code.task_id == "task_100"
    assert code.code_type == VerificationCodeType.PICKUP
    assert len(code.otp_code) == 6
    assert code.otp_code.isdigit()
    assert "task_100" in code.qr_payload
    assert "pickup" in code.qr_payload
    assert code.is_valid
    assert code.status == VerificationStatus.PENDING

    # Test single-use mark_verified
    code.mark_verified(volunteer_id="vol_1")
    assert code.status == VerificationStatus.VERIFIED
    assert not code.is_valid
    assert code.verified_by == "vol_1"

    # Single-use attempt again fails
    with pytest.raises(ValueError, match="not valid"):
        code.mark_verified(volunteer_id="vol_1")


def test_verification_code_expiration():
    """Expired codes cannot be used for verification."""
    expired_time = datetime.now(timezone.utc) - timedelta(hours=1)
    code = TaskVerificationCode(
        task_id="task_101",
        code_type=VerificationCodeType.DELIVERY,
        expires_at=expired_time,
    )
    assert not code.is_valid

    with pytest.raises(ValueError, match="not valid"):
        code.mark_verified(volunteer_id="vol_1")


def test_task_pickup_and_delivery_verification_flow():
    """Complete flow: Task created -> Pickup verified -> In Progress -> Delivery verified -> Completed."""
    service = CoordinationService()
    task = CoordinationTask(
        task_id="task_flow_test",
        title="Surplus Food Delivery",
        description="Deliver food to shelter",
        volunteer_id="vol_1",
        status=TaskLifecycle.ASSIGNED,
    )
    service.state.tasks.append(task)

    # 1. Generate verification codes
    pickup_code, delivery_code = service.generate_task_verification_codes(task)
    assert pickup_code.code_type == VerificationCodeType.PICKUP
    assert delivery_code.code_type == VerificationCodeType.DELIVERY

    verifications = service.get_task_verifications("task_flow_test")
    assert verifications["pickup_code"]["otp_code"] == pickup_code.otp_code
    assert verifications["delivery_code"]["otp_code"] == delivery_code.otp_code

    # 2. Cannot verify delivery before pickup
    with pytest.raises(ValueError, match="Pickup must be verified before delivery"):
        service.verify_task_delivery("task_flow_test", delivery_code.otp_code, "vol_1")

    # 3. Fail pickup with wrong OTP
    with pytest.raises(ValueError, match="Invalid"):
        service.verify_task_pickup("task_flow_test", "000000", "vol_1")

    # 4. Verify Pickup using QR payload string
    res_pickup = service.verify_task_pickup("task_flow_test", pickup_code.qr_payload, "vol_1")
    assert res_pickup["success"] is True
    assert task.pickup_verified is True
    assert task.status == TaskLifecycle.IN_PROGRESS

    # 5. Cannot reuse pickup OTP (single-use constraint)
    with pytest.raises(ValueError, match="Pickup has already been verified"):
        service.verify_task_pickup("task_flow_test", pickup_code.otp_code, "vol_1")

    # 6. Verify Delivery using OTP code
    res_delivery = service.verify_task_delivery("task_flow_test", delivery_code.otp_code, "vol_1")
    assert res_delivery["success"] is True
    assert task.delivery_verified is True
    assert task.status == TaskLifecycle.COMPLETED

    # 7. Cannot reuse delivery code
    with pytest.raises(ValueError, match="Delivery has already been verified"):
        service.verify_task_delivery("task_flow_test", delivery_code.otp_code, "vol_1")


def test_volunteer_reassignment_invalidates_old_codes():
    """Reassigning a volunteer invalidates old verification codes and creates new ones."""
    service = CoordinationService()
    task = CoordinationTask(
        task_id="task_reassign_test",
        title="Medical Kit Transport",
        description="Transport first aid kits",
        volunteer_id="vol_old",
        status=TaskLifecycle.ASSIGNED,
    )
    service.state.tasks.append(task)

    old_pickup, old_delivery = service.generate_task_verification_codes(task)

    # Reassign volunteer
    reassign_res = service.reassign_task_volunteer("task_reassign_test", "vol_new")
    assert task.volunteer_id == "vol_new"
    assert old_pickup.status == VerificationStatus.INVALIDATED
    assert old_delivery.status == VerificationStatus.INVALIDATED

    # Attempting pickup with old invalidated code fails
    with pytest.raises(ValueError, match="Invalid, expired, or non-matching"):
        service.verify_task_pickup("task_reassign_test", old_pickup.otp_code, "vol_new")

    # New active codes work
    new_verifications = service.get_task_verifications("task_reassign_test")
    new_pickup_otp = new_verifications["pickup_code"]["otp_code"]

    res_pickup = service.verify_task_pickup("task_reassign_test", new_pickup_otp, "vol_new")
    assert res_pickup["success"] is True
    assert task.pickup_verified is True
