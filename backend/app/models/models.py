from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    avatar = Column(String)
    cv_text = Column(Text)
    skills = Column(JSON)
    is_onboarded = Column(Boolean, default=False)
    full_name = Column(String)
    dob = Column(String)
    current_position = Column(String)
    
    interviews = relationship("Interview", back_populates="owner")

class Interview(Base):
    __tablename__ = "interviews"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    cv_text = Column(Text)
    jd_text = Column(Text)
    interview_type = Column(String)
    language = Column(String)
    transcript = Column(JSON)  # List of {role, content}
    evaluations = Column(JSON) # List of evaluations
    final_report = Column(Text)
    score = Column(Integer, default=0)
    status = Column(String, default="setup") # setup, in_progress, completed
    predicted_questions = Column(JSON)
    pending_questions = Column(JSON) # To survive session interruptions
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    owner = relationship("User", back_populates="interviews")
