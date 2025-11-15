from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    password = Column(String)

class Problem(Base):
    __tablename__ = "problems"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    buggy_file_blob = Column(Text)

class Submission(Base):
    __tablename__ = "submissions"

    team_id = Column(Integer, ForeignKey("teams.id"), primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), primary_key=True)
    submitted_at = Column(DateTime)
    code_file_blob = Column(Text)
    status = Column(String)

    team = relationship("Team")
    problem = relationship("Problem")

class TestCase(Base):
    __tablename__ = "test_cases"

    test_case_id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    input_data = Column(Text)
    expected_output = Column(Text)
    is_hidden = Column(Integer, default=0)  # 0 = visible, 1 = hidden

    problem = relationship("Problem")

class CodeDraft(Base):
    __tablename__ = "code_drafts"

    team_id = Column(Integer, ForeignKey("teams.id"), primary_key=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), primary_key=True)
    code = Column(Text)
    language = Column(String)
    saved_at = Column(DateTime)

    team = relationship("Team")
    problem = relationship("Problem")