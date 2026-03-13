"""
Main API router
"""
from fastapi import APIRouter
from app.api.v1 import auth, games, user, stats, feed, leaderboards, challenges, subscription

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(games.router, prefix="/games", tags=["games"])
api_router.include_router(user.router)
api_router.include_router(stats.router)
api_router.include_router(feed.router)
api_router.include_router(leaderboards.router)
api_router.include_router(challenges.router)
api_router.include_router(subscription.router)
