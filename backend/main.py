from dotenv import load_dotenv
# We must specify the path to the .env file
load_dotenv()

import os
from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
import models, database, piston, logger
from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any, Optional
import bcrypt
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed

# Admin secret key for accessing error logs (set in .env file)
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "change-this-secret-key")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or your Next.js origin like "http://localhost:3000"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Test database connection on startup"""
    try:
        db = database.SessionLocal()
        try:
            # Test connection by querying teams
            teams = db.query(models.Team).count()
            problems = db.query(models.Problem).count()
            test_cases = db.query(models.TestCase).count()
            
            print("✅ Database connection successful!")
            print(f"   📊 Database stats: {teams} teams, {problems} problems, {test_cases} test cases")
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("   ⚠️  Server will continue, but database operations may fail")

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

class BatchRunRequest(BaseModel):
    language: str
    code: str
    test_cases: List[Dict[str, Any]]  # List of {"input": str, "expected_output": str}

# Admin endpoints for viewing error logs
def verify_admin(admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret")):
    """Verify admin secret key"""
    if not admin_secret or admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized: Invalid admin secret")

@app.get("/admin/logs")
def get_error_logs(
    limit: int = 100,
    error_type: Optional[str] = None,
    team_id: Optional[int] = None,
    admin_secret: str = Header(None, alias="X-Admin-Secret"),
    db: Session = Depends(get_db)
):
    """Get error logs (admin only) - requires X-Admin-Secret header"""
    verify_admin(admin_secret)
    
    logs = logger.get_error_logs(limit=limit, error_type=error_type, team_id=team_id)
    return {
        "total": len(logs),
        "logs": logs
    }

@app.delete("/admin/logs")
def clear_error_logs(admin_secret: str = Header(None, alias="X-Admin-Secret")):
    """Clear all error logs (admin only) - requires X-Admin-Secret header"""
    verify_admin(admin_secret)
    
    success = logger.clear_error_logs()
    return {"success": success, "message": "Error logs cleared" if success else "Failed to clear logs"}

@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    """Test database connection and return basic info"""
    try:
        # Test connection by querying teams
        teams = db.query(models.Team).all()
        team_count = len(teams)
        
        # Test querying problems
        problems = db.query(models.Problem).all()
        problem_count = len(problems)
        
        # Test querying test cases
        test_cases = db.query(models.TestCase).all()
        test_case_count = len(test_cases)
        
        return {
            "status": "✅ Connected successfully!",
            "connection": "active",
            "database_stats": {
                "teams": team_count,
                "problems": problem_count,
                "test_cases": test_case_count
            }
        }
    except Exception as e:
        return {
            "status": "❌ Connection failed!",
            "connection": "failed",
            "error": str(e)
        }


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
def get_testcases(problem_id: int, include_hidden: bool = False, db: Session = Depends(get_db)):
    query = db.query(models.TestCase).filter(models.TestCase.problem_id == problem_id)
    if not include_hidden:
        # Only return visible test cases (is_hidden = 0 or None)
        query = query.filter((models.TestCase.is_hidden == 0) | (models.TestCase.is_hidden == None))
    test_cases = query.all()
    return [{"test_case_id": tc.test_case_id, "input_data": tc.input_data, "expected_output": tc.expected_output, "is_hidden": bool(tc.is_hidden)} for tc in test_cases]

@app.get("/submissions")
def get_submissions(team_id: int, db: Session = Depends(get_db)):
    submissions = db.query(models.Submission).filter(models.Submission.team_id == team_id).all()
    return [{"problem_id": s.problem_id, "status": s.status} for s in submissions]

def _process_test_case_submit(test_case, language, code, team_id, problem_id):
    """Process a single test case for submission (used in parallel execution)"""
    try:
        result = piston.execute_code(language=language, code=code, stdin=test_case.input_data)
        
        # Log errors if they exist
        if result.get("compile") and result["compile"].get("stderr"):
            logger.log_error(
                error_type="CompilationError",
                error_message=result["compile"]["stderr"],
                code=code,
                language=language,
                stdin=test_case.input_data,
                team_id=team_id,
                problem_id=problem_id,
                endpoint="/submit"
            )
        elif result.get("run") and result["run"].get("stderr"):
            logger.log_error(
                error_type="RuntimeError",
                error_message=result["run"]["stderr"],
                code=code,
                language=language,
                stdin=test_case.input_data,
                team_id=team_id,
                problem_id=problem_id,
                endpoint="/submit"
            )
        
        actual_output = ""
        if result.get("run"):
            actual_output = (result["run"].get("stdout") or result["run"].get("stderr") or result["run"].get("output") or "").strip()
        expected_output = (test_case.expected_output or "").strip()
        
        return {
            "passed": actual_output == expected_output,
            "error": None
        }
    except Exception as e:
        # Log submission errors
        logger.log_error(
            error_type="SubmissionError",
            error_message=str(e),
            code=code,
            language=language,
            stdin=test_case.input_data,
            team_id=team_id,
            problem_id=problem_id,
            endpoint="/submit"
        )
        return {
            "passed": False,
            "error": str(e)
        }

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

    # Fetch all test cases (including hidden ones)
    test_cases = db.query(models.TestCase).filter(models.TestCase.problem_id == request.problem_id).all()

    # Run code against all test cases in parallel using ThreadPoolExecutor
    # This helps handle concurrent requests from multiple teams during competition
    all_passed = True
    max_workers = min(len(test_cases), 20)  # Limit concurrent threads to avoid overwhelming the API
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all test cases for parallel execution
        future_to_test = {
            executor.submit(
                _process_test_case_submit,
                test_case,
                request.language,
                request.code,
                request.team_id,
                request.problem_id
            ): test_case
            for test_case in test_cases
        }
        
        # Process results as they complete
        for future in as_completed(future_to_test):
            result = future.result()
            if not result["passed"]:
                all_passed = False
                # Don't break immediately - let other threads complete, but we know it failed
                # This ensures all test cases are processed and logged

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
        
        # Log errors if they exist in the result
        # Check for compilation errors first
        if result.get("compile"):
            compile_data = result["compile"]
            # Check if stderr exists and is not empty
            if compile_data.get("stderr") and compile_data["stderr"].strip():
                logger.log_error(
                    error_type="CompilationError",
                    error_message=compile_data["stderr"],
                    code=request.code,
                    language=request.language,
                    stdin=request.stdin,
                    endpoint="/run"
                )
            # Also check if compile failed (exit code != 0) even if stderr is empty
            elif compile_data.get("code", 0) != 0:
                error_msg = compile_data.get("stderr") or compile_data.get("stdout") or "Compilation failed"
                if error_msg and error_msg.strip():
                    logger.log_error(
                        error_type="CompilationError",
                        error_message=error_msg,
                        code=request.code,
                        language=request.language,
                        stdin=request.stdin,
                        endpoint="/run"
                    )
        
        # Check for runtime errors
        if result.get("run"):
            run_data = result["run"]
            # Check if stderr exists and is not empty
            if run_data.get("stderr") and run_data["stderr"].strip():
                logger.log_error(
                    error_type="RuntimeError",
                    error_message=run_data["stderr"],
                    code=request.code,
                    language=request.language,
                    stdin=request.stdin,
                    endpoint="/run"
                )
            # Also check if run failed (exit code != 0) even if stderr is empty
            elif run_data.get("code", 0) != 0:
                error_msg = run_data.get("stderr") or run_data.get("stdout") or "Runtime error"
                if error_msg and error_msg.strip():
                    logger.log_error(
                        error_type="RuntimeError",
                        error_message=error_msg,
                        code=request.code,
                        language=request.language,
                        stdin=request.stdin,
                        endpoint="/run"
                    )
        
        return result
    except Exception as e:
        # Log API errors
        logger.log_error(
            error_type="APIError",
            error_message=str(e),
            code=request.code,
            language=request.language,
            stdin=request.stdin,
            endpoint="/run"
        )
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

def _process_test_case_batch(test_case, language, code):
    """Process a single test case for batch run (used in parallel execution)"""
    try:
        result = piston.execute_code(
            language=language,
            code=code,
            stdin=test_case.get("input", "")
        )
        
        # Log errors if they exist
        # Check for compilation errors first
        if result.get("compile"):
            compile_data = result["compile"]
            if compile_data.get("stderr") and compile_data["stderr"].strip():
                logger.log_error(
                    error_type="CompilationError",
                    error_message=compile_data["stderr"],
                    code=code,
                    language=language,
                    stdin=test_case.get("input", ""),
                    endpoint="/run-batch"
                )
            elif compile_data.get("code", 0) != 0:
                error_msg = compile_data.get("stderr") or compile_data.get("stdout") or "Compilation failed"
                if error_msg and error_msg.strip():
                    logger.log_error(
                        error_type="CompilationError",
                        error_message=error_msg,
                        code=code,
                        language=language,
                        stdin=test_case.get("input", ""),
                        endpoint="/run-batch"
                    )
        
        # Check for runtime errors
        if result.get("run"):
            run_data = result["run"]
            if run_data.get("stderr") and run_data["stderr"].strip():
                logger.log_error(
                    error_type="RuntimeError",
                    error_message=run_data["stderr"],
                    code=code,
                    language=language,
                    stdin=test_case.get("input", ""),
                    endpoint="/run-batch"
                )
            elif run_data.get("code", 0) != 0:
                error_msg = run_data.get("stderr") or run_data.get("stdout") or "Runtime error"
                if error_msg and error_msg.strip():
                    logger.log_error(
                        error_type="RuntimeError",
                        error_message=error_msg,
                        code=code,
                        language=language,
                        stdin=test_case.get("input", ""),
                        endpoint="/run-batch"
                    )
        
        # Extract output
        actual_output = ""
        if result.get("run"):
            actual_output = (result["run"].get("stdout") or result["run"].get("stderr") or result["run"].get("output") or "").strip()
        elif result.get("compile"):
            actual_output = (result["compile"].get("stdout") or result["compile"].get("stderr") or result["compile"].get("output") or "").strip()
        
        expected_output = test_case.get("expected_output", "").strip()
        passed = actual_output == expected_output
        
        return {
            "input": test_case.get("input", ""),
            "expected_output": expected_output,
            "actual_output": actual_output,
            "passed": passed,
            "error": None
        }
    except Exception as e:
        logger.log_error(
            error_type="BatchExecutionError",
            error_message=str(e),
            code=code,
            language=language,
            stdin=test_case.get("input", ""),
            endpoint="/run-batch"
        )
        return {
            "input": test_case.get("input", ""),
            "expected_output": test_case.get("expected_output", ""),
            "actual_output": None,
            "passed": False,
            "error": "Execution failed"
        }

@app.post("/run-batch")
def run_batch(request: BatchRunRequest):
    """Run code against multiple test cases in one request (parallel execution)"""
    try:
        # Use ThreadPoolExecutor for parallel processing
        # This helps handle concurrent requests from multiple teams during competition
        max_workers = min(len(request.test_cases), 20)  # Limit concurrent threads
        
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all test cases for parallel execution
            future_to_test = {
                executor.submit(
                    _process_test_case_batch,
                    test_case,
                    request.language,
                    request.code
                ): idx
                for idx, test_case in enumerate(request.test_cases)
            }
            
            # Collect results as they complete (maintain order by using index)
            results_dict = {}
            for future in as_completed(future_to_test):
                idx = future_to_test[future]
                result = future.result()
                results_dict[idx] = result
            
            # Reconstruct results in original order
            results = [results_dict[i] for i in sorted(results_dict.keys())]
        
        return {"results": results}
    except Exception as e:
        logger.log_error(
            error_type="BatchAPIError",
            error_message=str(e),
            code=request.code,
            language=request.language,
            endpoint="/run-batch"
        )
        raise HTTPException(status_code=500, detail=f"Batch execution failed: {str(e)}")
