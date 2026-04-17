"""User preference endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apex_identity.database import get_db
from apex_identity.dependencies import get_current_user
from apex_identity.models import User, UserPreference
from apex_identity.schemas import PreferenceResponse, PreferenceSet

router = APIRouter(prefix="/users/me/preferences", tags=["preferences"])


@router.get("", response_model=list[PreferenceResponse])
async def list_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all preferences for the authenticated user."""
    result = await db.execute(
        select(UserPreference).where(UserPreference.user_id == current_user.id)
    )
    return result.scalars().all()


@router.get("/{key}", response_model=PreferenceResponse)
async def get_preference(
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a single preference by key."""
    result = await db.execute(
        select(UserPreference).where(
            UserPreference.user_id == current_user.id, UserPreference.key == key
        )
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preference not found")
    return pref


@router.put("", response_model=PreferenceResponse)
async def set_preference(
    body: PreferenceSet,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a preference. Upsert semantics."""
    result = await db.execute(
        select(UserPreference).where(
            UserPreference.user_id == current_user.id, UserPreference.key == body.key
        )
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        pref = UserPreference(user_id=current_user.id, key=body.key, value=body.value)
        db.add(pref)
    else:
        pref.value = body.value
    await db.commit()
    await db.refresh(pref)
    return pref


@router.delete("/{key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preference(
    key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a preference by key."""
    result = await db.execute(
        select(UserPreference).where(
            UserPreference.user_id == current_user.id, UserPreference.key == key
        )
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preference not found")
    await db.delete(pref)
    await db.commit()
