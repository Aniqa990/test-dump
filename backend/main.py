from dotenv import load_dotenv
# We must specify the path to the .env file
load_dotenv()

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models, database, piston
from pydantic import BaseModel
from datetime import datetime
import bcrypt
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or your Next.js origin like "http://localhost:3000"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"message": "pong"}

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

class LoginRequest(BaseModel):
    team_name: str
    password: str

class SubmissionRequest(BaseModel):
    problem_id: int
    team_id: int
    code: str
    language: str

class RunRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"teams": [t.name for t in db.query(models.Team).all()]}


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Find the team by name
    team = db.query(models.Team).filter(models.Team.name == request.team_name).first()
    
    if not team:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password
    if not bcrypt.checkpw(request.password.encode('utf-8'), team.password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"team_id": team.id, "team_name": team.name, "authenticated": True}

@app.get("/problems")
def get_problems(db: Session = Depends(get_db)):
    problems = db.query(models.Problem).all()
    return [{"id": p.id, "title": p.title, "buggy_file_blob": p.buggy_file_blob} for p in problems]

@app.get("/testcases")
def get_testcases(problem_id: int, db: Session = Depends(get_db)):
    test_cases = db.query(models.TestCase).filter(models.TestCase.problem_id == problem_id).all()
    return [{"test_case_id": tc.test_case_id, "input_data": tc.input_data, "expected_output": tc.expected_output} for tc in test_cases]

@app.get("/submissions")
def get_submissions(team_id: int, db: Session = Depends(get_db)):
    submissions = db.query(models.Submission).filter(models.Submission.team_id == team_id).all()
    return [{"problem_id": s.problem_id, "status": s.status} for s in submissions]

@app.post("/submit")
def submit(request: SubmissionRequest, db: Session = Depends(get_db)):
    # Check problem existence
    problem = db.query(models.Problem).filter(models.Problem.id == request.problem_id).first()
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Check team existence
    team = db.query(models.Team).filter(models.Team.id == request.team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Fetch all test cases
    test_cases = db.query(models.TestCase).filter(models.TestCase.problem_id == request.problem_id).all()

    # Run code against test cases
    all_passed = True
    for test_case in test_cases:
        result = piston.execute_code(language=request.language, code=request.code, stdin=test_case.input_data)
        if result.get("run", {}).get("output") != test_case.expected_output:
            all_passed = False
            break

    status = "Accepted" if all_passed else "Wrong Answer"

    # Check if a previous submission exists for this team & problem
    existing_submission = db.query(models.Submission).filter(
        models.Submission.team_id == request.team_id,
        models.Submission.problem_id == request.problem_id
    ).first()

    if existing_submission:
        # Update the existing submission
        existing_submission.status = status
        existing_submission.code_file_blob = request.code
        existing_submission.submitted_at = datetime.now()
    else:
        # Insert a new submission
        new_submission = models.Submission(
            team_id=request.team_id,
            problem_id=request.problem_id,
            submitted_at=datetime.now(),
            code_file_blob=request.code,
            status=status
        )
        db.add(new_submission)

    db.commit()
    return {"status": status}

@app.post("/run")
def run_code(request: RunRequest):
    try:
        result = piston.execute_code(
            language=request.language,
            code=request.code,
            stdin=request.stdin
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")
