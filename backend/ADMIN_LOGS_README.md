# Admin Error Logging System

## Overview

This system logs all errors that occur during code execution, but hides them from participants. Only event organizers can access the error logs.

## Setup

### 1. Set Admin Secret Key

Add this to your `.env` file:

```env
ADMIN_SECRET=your-secret-key-here-change-this
```

**Important:** Use a strong, unique secret key that only you know!

## How to View Error Logs

### Method 1: Using the API Endpoint (Recommended)

**Get Error Logs:**

```bash
curl -H "X-Admin-Secret: your-secret-key-here" \
  "http://127.0.0.1:8001/admin/logs?limit=50"
```

**Filter by Error Type:**

```bash
curl -H "X-Admin-Secret: your-secret-key-here" \
  "http://127.0.0.1:8001/admin/logs?error_type=CompilationError&limit=20"
```

**Filter by Team ID:**

```bash
curl -H "X-Admin-Secret: your-secret-key-here" \
  "http://127.0.0.1:8001/admin/logs?team_id=1&limit=50"
```

**Clear All Logs:**

```bash
curl -X DELETE -H "X-Admin-Secret: your-secret-key-here" \
  "http://127.0.0.1:8001/admin/logs"
```

### Method 2: Using the View Script

```bash
cd backend
python view_logs.py [limit] [error_type] [team_id]

# Examples:
python view_logs.py                    # Show last 50 logs
python view_logs.py 100                 # Show last 100 logs
python view_logs.py 50 CompilationError # Show last 50 compilation errors
python view_logs.py 20 RuntimeError 1   # Show last 20 runtime errors for team 1
```

### Method 3: Direct File Access

Logs are stored in: `backend/logs/error_log.jsonl`

You can read this file directly:

```bash
# View last 20 lines
tail -n 20 backend/logs/error_log.jsonl

# View all logs
cat backend/logs/error_log.jsonl | python -m json.tool
```

## What Gets Logged

- **Compilation Errors**: Syntax errors, type errors, etc.
- **Runtime Errors**: NameError, ValueError, etc.
- **API Errors**: Connection failures, etc.
- **Submission Errors**: Errors during final submission

Each log entry includes:

- Timestamp
- Error type
- Full error message
- Code that caused the error
- Language used
- Input provided
- Team ID (if available)
- Problem ID (if available)
- Endpoint where error occurred

## Security

- Logs are stored in `backend/logs/` directory (not accessible via web)
- Admin endpoints require `X-Admin-Secret` header
- Participants cannot access error logs
- Log file is in `.gitignore` (won't be committed to git)

## Log File Format

Logs are stored in JSON Lines format (one JSON object per line):

```json
{"timestamp": "2024-11-15T12:34:56", "error_type": "CompilationError", "error_message": "...", ...}
{"timestamp": "2024-11-15T12:35:01", "error_type": "RuntimeError", "error_message": "...", ...}
```

## Example Log Entry

```json
{
  "timestamp": "2024-11-15T12:34:56.789012",
  "error_type": "CompilationError",
  "error_message": "SyntaxError: invalid syntax\n  File \"main.py\", line 2\n    print(\"hello\"\n              ^",
  "endpoint": "/run",
  "team_id": null,
  "problem_id": null,
  "language": "python",
  "code": "print(\"hello\"\nprint(\"world\")",
  "stdin": "",
  "additional_info": {}
}
```
