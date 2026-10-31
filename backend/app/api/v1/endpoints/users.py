from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_firebase_token_payload, require_roles
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse
from app.schemas.user import (
    CustomerProfileCreateRequest,
    ResendLinksResponse,
    StaffCreateRequest,
    StaffCreateResponse,
    UserResponse,
)
from app.services.user_service import user_service

router = APIRouter()


@router.post(
    "/profile",
    response_model=UserResponse,
    summary="Initialize Customer Profile",
    description="Registers an application customer profile linked to the verified Firebase identity.",
)
async def initialize_profile(
    profile_data: CustomerProfileCreateRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(get_firebase_token_payload),
) -> UserResponse:
    firebase_uid = token_payload.get("uid")
    email = token_payload.get("email")

    if not firebase_uid or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase identity token must contain a valid UID and email.",
        )

    user, created = await user_service.initialize_customer_profile(
        db=db,
        firebase_uid=firebase_uid,
        email=email,
        profile_data=profile_data,
    )

    if created:
        response.status_code = status.HTTP_201_CREATED
    else:
        response.status_code = status.HTTP_200_OK

    return UserResponse.model_validate(user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current User Profile",
    description="Retrieves the profile of the currently authenticated user.",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post(
    "/staff",
    response_model=StaffCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Staff Account (Admin Only)",
    description="Creates a staff identity in Firebase and PostgreSQL, generating onboarding credential setup links.",
)
async def create_staff(
    staff_data: StaffCreateRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> StaffCreateResponse:
    return await user_service.create_staff_account(
        db=db,
        admin_user=admin_user,
        staff_data=staff_data,
    )


@router.post(
    "/staff/{staff_id}/resend-setup-link",
    response_model=ResendLinksResponse,
    summary="Resend Staff Onboarding Links (Admin Only)",
    description="Re-generates and dispatches onboarding links for staff members with pending onboarding.",
)
async def resend_staff_links(
    staff_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(require_roles(UserRole.ADMIN)),
) -> ResendLinksResponse:
    return await user_service.resend_staff_links(
        db=db,
        admin_user=admin_user,
        staff_id=staff_id,
    )


@router.get(
    "",
    response_model=PaginatedResponse[UserResponse],
    summary="List Users",
    description="Lists users with strict role isolation (Staff members are limited to customer profiles).",
)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    role: Optional[UserRole] = Query(None, description="Optional role filter"),
    search: Optional[str] = Query(None, description="Search term for name, email, or company"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.STAFF)),
) -> PaginatedResponse[UserResponse]:
    return await user_service.list_users(
        db=db,
        current_user=current_user,
        page=page,
        page_size=page_size,
        role_filter=role,
        search=search,
    )
