"""
Error logging system for event organizers
Logs all errors to a file that participants cannot access
"""

import os
import json
from datetime import datetime
from pathlib import Path

# Create logs directory if it doesn't exist
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Error log file path
ERROR_LOG_FILE = LOG_DIR / "error_log.jsonl"  # JSON Lines format for easy parsing

def log_error(
    error_type: str,
    error_message: str,
    code: str = None,
    language: str = None,
    stdin: str = None,
    team_id: int = None,
    problem_id: int = None,
    endpoint: str = None,
    additional_info: dict = None
):
    """
    Log an error to the error log file
    
    Args:
        error_type: Type of error (e.g., "CompilationError", "RuntimeError", "APIError")
        error_message: The actual error message/details
        code: The code that caused the error (optional)
        language: Programming language (optional)
        stdin: Input provided (optional)
        team_id: Team ID if available (optional)
        problem_id: Problem ID if available (optional)
        endpoint: API endpoint where error occurred (optional)
        additional_info: Any additional information (optional dict)
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "error_type": error_type,
        "error_message": error_message,
        "endpoint": endpoint,
        "team_id": team_id,
        "problem_id": problem_id,
        "language": language,
        "code": code,
        "stdin": stdin,
        "additional_info": additional_info or {}
    }
    
    # Write to log file (append mode)
    try:
        with open(ERROR_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as e:
        # Fallback: print to console if file write fails
        print(f"Failed to write to error log: {e}")
        print(f"Log entry: {log_entry}")

def get_error_logs(limit: int = 100, error_type: str = None, team_id: int = None):
    """
    Read error logs from the log file
    
    Args:
        limit: Maximum number of log entries to return
        error_type: Filter by error type (optional)
        team_id: Filter by team_id (optional)
    
    Returns:
        List of log entries
    """
    if not ERROR_LOG_FILE.exists():
        return []
    
    logs = []
    try:
        with open(ERROR_LOG_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    try:
                        log_entry = json.loads(line)
                        
                        # Apply filters
                        if error_type and log_entry.get("error_type") != error_type:
                            continue
                        if team_id and log_entry.get("team_id") != team_id:
                            continue
                        
                        logs.append(log_entry)
                    except json.JSONDecodeError:
                        continue
        
        # Return most recent logs first, limit the count
        logs.reverse()
        return logs[:limit]
    except Exception as e:
        print(f"Failed to read error log: {e}")
        return []

def clear_error_logs():
    """Clear all error logs (use with caution)"""
    try:
        if ERROR_LOG_FILE.exists():
            ERROR_LOG_FILE.unlink()
        return True
    except Exception as e:
        print(f"Failed to clear error log: {e}")
        return False

