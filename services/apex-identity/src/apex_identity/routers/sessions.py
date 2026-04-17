"""Chat session and message endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from apex_identity.database import get_db
from apex_identity.dependencies import get_current_user
from apex_identity.models import ChatSession, Message, User
from apex_identity.schemas import (
    MessageCreate,
    MessageResponse,
    SessionCreate,
    SessionDetailResponse,
    SessionResponse,
    SessionUpdate,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ── Helpers ──────────────────────────────────────────────────────


def _msg_to_response(msg: Message) -> MessageResponse:
    """Convert a Message ORM object to a MessageResponse, deserializing JSON fields."""
    return MessageResponse(
        id=msg.id,
        role=msg.role,
        content=msg.content,
        sources=json.loads(msg.sources) if msg.sources else None,
        files=json.loads(msg.files) if msg.files else None,
        created_at=msg.created_at,
    )


async def _get_user_session(
    session_id: str, user: User, db: AsyncSession
) -> ChatSession:
    """Return a ChatSession owned by *user* or raise 404."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


# ── Session CRUD ─────────────────────────────────────────────────


@router.get("", response_model=list[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for the authenticated user (newest first)."""
    # Sub-query to count messages per session
    msg_count = (
        select(Message.session_id, func.count(Message.id).label("cnt"))
        .group_by(Message.session_id)
        .subquery()
    )
    result = await db.execute(
        select(ChatSession, func.coalesce(msg_count.c.cnt, 0).label("message_count"))
        .outerjoin(msg_count, ChatSession.id == msg_count.c.session_id)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    rows = result.all()
    return [
        SessionResponse(
            id=sess.id,
            title=sess.title,
            created_at=sess.created_at,
            updated_at=sess.updated_at,
            message_count=count,
        )
        for sess, count in rows
    ]


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session."""
    session = ChatSession(user_id=current_user.id, title=body.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a chat session with all its messages."""
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    return SessionDetailResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=[_msg_to_response(m) for m in session.messages],
    )


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    body: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update session metadata (title)."""
    session = await _get_user_session(session_id, current_user, db)
    session.title = body.title
    await db.commit()
    await db.refresh(session)

    # Count messages
    count_result = await db.execute(
        select(func.count(Message.id)).where(Message.session_id == session.id)
    )
    count = count_result.scalar() or 0

    return SessionResponse(
        id=session.id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=count,
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session and all its messages."""
    session = await _get_user_session(session_id, current_user, db)
    await db.delete(session)
    await db.commit()


# ── Messages ─────────────────────────────────────────────────────


@router.get("/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all messages in a session, ordered chronologically."""
    await _get_user_session(session_id, current_user, db)  # ownership check
    result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at)
    )
    return [_msg_to_response(m) for m in result.scalars().all()]


@router.post(
    "/{session_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_message(
    session_id: str,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Add a message to a chat session."""
    await _get_user_session(session_id, current_user, db)  # ownership check
    msg = Message(
        session_id=session_id,
        role=body.role,
        content=body.content,
        sources=json.dumps(body.sources) if body.sources else None,
        files=json.dumps(body.files) if body.files else None,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return _msg_to_response(msg)
