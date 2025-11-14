# Code-Fu: The Debugging Trials - Complete Project Flow

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [User Flow](#user-flow)
3. [Code Editor Flow](#code-editor-flow)
4. [Piston API Integration](#piston-api-integration)
5. [Submission & Testing Flow](#submission--testing-flow)

---

## 🏗️ Architecture Overview

### **Three-Tier Architecture:**

```
┌─────────────────┐
│  Next.js Frontend │  (Port 3000)
│  - React Components│
│  - API Routes     │
└────────┬─────────┘
         │ HTTP Requests
         ▼
┌─────────────────┐
│  Python Backend  │  (Port 8001)
│  - FastAPI       │
│  - SQLite DB     │
└────────┬─────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  Piston API      │  (External)
│  - Code Execution│
│  - Multi-language │
└─────────────────┘
```

---

## 👤 User Flow

### **1. Landing Page → Login → Main Dashboard**

```
User Opens App
    ↓
Landing Page (Code-Fu branding)
    ↓
"Enter the Dojo" Button
    ↓
Login Page
    ↓
Enter Team Name & Password
    ↓
POST /api/login → Python Backend
    ↓
Validate Credentials (SQLite DB)
    ↓
Store team_info in localStorage
    ↓
Main Dashboard (Map View)
```

**Key Files:**

- `src/app/page.js` - Main orchestrator
- `src/app/landing.js` - Landing page
- `src/app/login.js` - Login component
- `src/app/api/login/route.js` - Login API proxy

---

## 💻 Code Editor Flow

### **2. Opening a Problem**

```
User Clicks Problem on Map
    ↓
Navigate to /branch/[id]
    ↓
Fetch Problem Data:
  - GET /api/problems → Python Backend
  - Returns: problem details, buggy code
    ↓
Load Code Editor:
  - Display buggy Python code
  - Show problem description
  - Initialize language selector
```

**Key Files:**

- `src/app/branch/[id]/page.js` - Problem page component
- `src/app/api/problems/route.js` - Problems API proxy

### **3. Language Selection & Code Generation**

When user selects a different language:

```javascript
// In branch/[id]/page.js
const generateCodeTemplate = (pythonCode, targetLanguage, problemId) => {
  // 1. Parse Python code to extract:
  //    - Function name
  //    - Parameters
  //    - Buggy return statement
  // 2. Generate language-specific template:
  //    - Python: Original buggy code
  //    - JavaScript: Function + stdin reading
  //    - Java: Class + Scanner
  //    - C++: main() + cin
  //    - C: main() + scanf
  //    - C#: Main() + Console.ReadLine()
  // 3. Return template with bug preserved
};
```

**Example Transformation:**

```python
# Original Python (buggy)
def power(a, b):
    return a ** b - 1  # Bug: should be a ** b

# Generated JavaScript
function power(a, b) {
    return a ** b - 1; // Bug: fix this
}
// stdin reading code...
```

---

## ⚙️ Piston API Integration

### **4. Code Execution Flow (Run Button)**

```
User Clicks "▶ Run" Button
    ↓
handleRun() function
    ↓
1. Validate code exists
2. Detect hardcoded values & stdin usage
3. Auto-fill stdin if needed (prevents ValueError)
    ↓
POST /api/run
    {
      language: "python",
      code: "user's code",
      stdin: "input values"
    }
    ↓
Next.js API Route (/api/run/route.js)
    ↓
Forward to Python Backend
    POST http://127.0.0.1:8001/run
    ↓
Python Backend (main.py)
    ↓
piston.execute_code()
    ↓
POST to Piston API
    POST https://emkc.org/api/v2/piston/execute
    {
      "language": "python",
      "version": "*",
      "files": [{"content": "code"}],
      "stdin": "input"
    }
    ↓
Piston API Response:
    {
      "run": {
        "stdout": "output",
        "stderr": "errors",
        "output": "combined"
      },
      "compile": {...}
    }
    ↓
Return to Frontend
    ↓
Display Output in Code Editor
```

**Key Files:**

- `src/app/branch/[id]/page.js` - `handleRun()` function
- `src/app/api/run/route.js` - Next.js API proxy
- `backend/main.py` - `/run` endpoint
- `backend/piston.py` - Piston API wrapper

### **5. Stdin Handling Logic**

The code editor intelligently handles stdin:

```javascript
// Detection Logic:
const hasHardcodedValues = /print\s*\([^)]*\d+[^)]*\)/.test(code);
const hasStdinCode = code.includes("sys.stdin.readline()") ||
                     code.includes("input()") || ...;

// If both exist and stdin is empty:
if (hasHardcodedValues && hasStdinCode && !stdin.trim()) {
  // Provide dummy stdin to prevent ValueError
  if (code.includes("a, b =")) {
    useStdin = "0 0";  // Two values
  } else {
    useStdin = "0";    // Single value
  }
}
```

**Why?** When code has both:

- `print(func(1, 2))` (hardcoded test)
- `a, b = sys.stdin.readline().split()` (stdin reading)

The stdin line executes first and needs input, even if the print uses hardcoded values.

---

## 🧪 Submission & Testing Flow

### **6. Run Test Cases**

```
User Clicks "🧪 Run Tests" Button
    ↓
handleRunTestCases() function
    ↓
1. Fetch test cases:
   GET /api/testcases?problem_id=X
    ↓
2. For each test case:
   - Execute code with test input
   - Compare output with expected
   - Track pass/fail
    ↓
3. Display results:
   Test Results: 3/5 passed
   Test Case 1: ✅ PASSED
   Test Case 2: ❌ FAILED
   ...
```

**Key Files:**

- `src/app/branch/[id]/page.js` - `handleRunTestCases()` function
- `src/app/api/testcases/route.js` - Test cases API proxy
- `backend/main.py` - `/testcases` endpoint

### **7. Submit Solution**

```
User Clicks "Submit" Button
    ↓
handleSubmit() function
    ↓
POST /api/submit
    {
      problem_id: 1,
      team_id: 2,
      code: "corrected code",
      language: "python"
    }
    ↓
Next.js API Route (/api/submit/route.js)
    ↓
Python Backend /submit endpoint
    ↓
1. Fetch all test cases for problem
2. Run code against EACH test case:
   - Execute via Piston API
   - Compare output with expected
3. Determine status:
   - All passed → "Accepted"
   - Any failed → "Wrong Answer"
    ↓
4. Save to database:
   - Update or create submission record
   - Store code, status, timestamp
    ↓
5. Return status to frontend
    ↓
Update UI:
   - Show success/error toast
   - Update problem status on map
   - Update solved count
```

**Key Files:**

- `src/app/branch/[id]/page.js` - `handleSubmit()` function
- `src/app/api/submit/route.js` - Submit API proxy
- `backend/main.py` - `/submit` endpoint (lines 83-131)

---

## 🔄 Data Flow Summary

### **Frontend State Management:**

```javascript
// Local State (React)
- code: User's code
- language: Selected language
- stdin: Input values
- output: Execution results
- testCases: Fetched test cases
- submissions: Problem statuses

// LocalStorage (Persistent)
- team_info: {team_id, team_name}
- timer_start_time: Timestamp
- submissions: {problem_id: status}
- problems_cache: Cached problem list

// Backend Database (SQLite)
- teams: Team credentials
- problems: Problem details
- test_cases: Input/output pairs
- submissions: Submission records
```

### **API Endpoints:**

| Endpoint           | Method | Purpose          | Returns                 |
| ------------------ | ------ | ---------------- | ----------------------- |
| `/api/login`       | POST   | Authenticate     | team_id, team_name      |
| `/api/problems`    | GET    | Get all problems | Problem list            |
| `/api/testcases`   | GET    | Get test cases   | Test case array         |
| `/api/run`         | POST   | Execute code     | Execution result        |
| `/api/submit`      | POST   | Submit solution  | Status (Accepted/Wrong) |
| `/api/submissions` | GET    | Get submissions  | Submission list         |

---

## 🎯 Key Features Explained

### **1. Multi-Language Support**

- Code templates generated from Python buggy code
- Preserves the bug across languages
- Language-specific stdin handling

### **2. Intelligent Stdin Handling**

- Detects hardcoded test values
- Auto-provides stdin when needed
- Prevents ValueError exceptions

### **3. Test Case Validation**

- Run tests before submitting
- See which cases pass/fail
- Detailed output comparison

### **4. Real-time Code Execution**

- Instant feedback via Piston API
- Supports 6+ languages
- Handles compilation errors

### **5. Submission System**

- Validates against all test cases
- Updates database
- Tracks progress on map

---

## 🚀 Running the Project

### **Prerequisites:**

1. Python 3.8+ with FastAPI
2. Node.js 18+ with Next.js
3. SQLite database (auto-created)

### **Start Backend:**

```bash
cd backend
python -m uvicorn main:app --reload --port 8001
```

### **Start Frontend:**

```bash
npm run dev
```

### **Access:**

- Frontend: http://localhost:3000
- Backend API: http://127.0.0.1:8001
- Piston API: https://emkc.org/api/v2/piston/execute (external)

---

## 📝 Notes

- **Piston API** is a free, public code execution service
- All code execution happens server-side (Python backend)
- Frontend only handles UI and API proxying
- Test cases are stored in database, not hardcoded
- Timer is client-side but validated server-side

---

## 🔍 Debugging Tips

1. **Code not executing?**

   - Check Python backend is running (port 8001)
   - Check Piston API is accessible
   - Check browser console for errors

2. **Stdin errors?**

   - Check `handleRun()` stdin detection logic
   - Verify code has stdin reading statements

3. **Test cases failing?**

   - Check output trimming (whitespace matters)
   - Verify test case format in database
   - Check Piston API response format

4. **Submission not working?**
   - Verify team_id is correct
   - Check database connection
   - Verify test cases exist for problem
