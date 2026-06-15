from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


class FaceEmbedding(Base):
    """
    One row per enrolled user holding all their ArcFace embeddings as a packed
    float32 matrix (count x dim). Stored in the DB so recognition data survives
    restarts/redeploys (stateless backend).
    """

    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    embeddings = Column(LargeBinary, nullable=False)  # np.float32 (count, dim).tobytes()
    count = Column(Integer, nullable=False)
    dim = Column(Integer, nullable=False, default=512)
    model = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="face_embedding")


class FaceImage(Base):
    """A stored face image (JPEG bytes) used at enrollment, for the gallery."""

    __tablename__ = "face_images"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, nullable=False)  # 1..N
    image_data = Column(LargeBinary, nullable=False)
    content_type = Column(String, default="image/jpeg")
    quality_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="face_images")
