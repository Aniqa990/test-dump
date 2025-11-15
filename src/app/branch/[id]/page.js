"use client"

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";
import styles from "./page.module.css";

const problemNameMap = {
  1: "mantis",
  2: "monkey",
  3: "viper",
  4: "crane",
  5: "tigress",
  6: "shifu",
};

const branchMeta = {
  1: {
    nickname: "Mantis",
    title: "The Jade Springs Dojo",
    description:
      "Precision and patience rule this grove. Debug every edge case with the calm of a mantis awaiting its strike.",
    accent: "#8bc34a",
    image: "/images/mantis.png",
    pdf: "/problems/mantis.pdf",
  },
  2: {
    nickname: "Monkey",
    title: "Cloud Ladders of Humor",
    description:
      "Mischief hides real wisdom. Twist your thinking, refactor the unexpected, and swing through logical traps.",
    accent: "#ffb74d",
    image: "/images/monkey.png",
    pdf: "/problems/monkey.pdf",
  },
  3: {
    nickname: "Viper",
    title: "Serpent's Spiral Garden",
    description:
      "Graceful logic, slippery bugs. Strike with elegant fixes that keep flow smooth and deadly accurate.",
    accent: "#4dd0e1",
    image: "/images/viper.png",
    pdf: "/problems/viper.pdf",
  },
  4: {
    nickname: "Crane",
    title: "Skyward Crystal Peaks",
    description:
      "Balance performance with simplicity. Lift the program gently, optimizing without breaking harmony.",
    accent: "#b39ddb",
    image: "/images/crane.png",
    pdf: "/problems/crane.pdf",
  },
  5: {
    nickname: "Tigress",
    title: "Temple of Relentless Focus",
    description:
      "Power through fierce defects. Assert discipline in every function and guard the code with intensity.",
    accent: "#ff7043",
    image: "/images/tigress.png",
    pdf: "/problems/tigress.pdf",
  },
  6: {
    nickname: "Master Shifu",
    title: "Hall of the Spirit Scroll",
    description:
      "All five styles converge. Combine everything you've learned to bring perfect harmony back to the Valley.",
    accent: "#fdd835",
    image: "/images/shifu.png",
    pdf: "/problems/shifu.pdf",
  },
};

const languageOptions = [
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "Node.js" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++ (GCC)" },
  { value: "c", label: "C (GCC)" },
  { value: "csharp", label: "C#" },
];

// Generate language-specific code templates based on Python buggy code
const generateCodeTemplate = (pythonCode, targetLanguage, problemId) => {
  // Extract function name and logic from Python code
  const functionMatch = pythonCode.match(/def\s+(\w+)\s*\([^)]*\)\s*:/);
  if (!functionMatch) {
    // Fallback templates if we can't parse
    const templates = {
      python: pythonCode,
      javascript: `// Write your fix here\n\nfunction solution() {\n    // TODO: Implement your solution\n}\n\n// Read input\nconst readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nrl.on('line', (line) => {\n    // Process input\n    console.log(solution());\n    rl.close();\n});`,
      java: `// Write your fix here\n\npublic class Main {\n    public static void main(String[] args) {\n        // TODO: Implement your solution\n        java.util.Scanner scanner = new java.util.Scanner(System.in);\n        // Read input and process\n    }\n}`,
      cpp: `// Write your fix here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // TODO: Implement your solution\n    int a, b;\n    cin >> a >> b;\n    // Process and output\n    return 0;\n}`,
      c: `// Write your fix here\n\n#include <stdio.h>\n\nint main() {\n    // TODO: Implement your solution\n    int a, b;\n    scanf("%d %d", &a, &b);\n    // Process and output\n    return 0;\n}`,
      csharp: `// Write your fix here\n\nusing System;\n\nclass Program {\n    static void Main() {\n        // TODO: Implement your solution\n        string[] input = Console.ReadLine().Split();\n        // Process and output\n    }\n}`,
    };
    return templates[targetLanguage] || pythonCode;
  }

  const functionName = functionMatch[1];
  const paramsMatch = pythonCode.match(/def\s+\w+\s*\(([^)]*)\)/);
  const params = paramsMatch ? paramsMatch[1].split(',').map(p => p.trim()) : [];

  // Extract the buggy return statement
  const returnMatch = pythonCode.match(/return\s+([^#\n]+)/);
  const buggyReturn = returnMatch ? returnMatch[1].trim() : '';

  // Extract main block logic
  const mainBlock = pythonCode.includes("if __name__ == '__main__':")
    ? pythonCode.split("if __name__ == '__main__':")[1]
    : '';

  // Generate templates based on problem structure
  // For Python, we keep the original code as-is so users can modify it freely
  const templates = {
    python: pythonCode, // Keep original Python code - user can modify it
    javascript: `function ${functionName}(${params.join(', ')}) {\n    // This function has a bug\n    return ${buggyReturn}; // Bug: fix this\n}\n\n// Read input from stdin\nconst readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet inputLines = [];\nrl.on('line', (line) => {\n    inputLines.push(line);\n});\n\nrl.on('close', () => {\n    const [a, b] = inputLines[0].split(' ').map(Number);\n    console.log(${functionName}(a, b));\n});`,
    java: `public class Main {\n    public static int ${functionName}(${params.map(p => `int ${p}`).join(', ')}) {\n        // This function has a bug\n        return ${buggyReturn}; // Bug: fix this\n    }\n    \n    public static void main(String[] args) {\n        java.util.Scanner scanner = new java.util.Scanner(System.in);\n        int a = scanner.nextInt();\n        int b = scanner.nextInt();\n        System.out.println(${functionName}(a, b));\n    }\n}`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint ${functionName}(${params.map(p => `int ${p}`).join(', ')}) {\n    // This function has a bug\n    return ${buggyReturn}; // Bug: fix this\n}\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << ${functionName}(a, b) << endl;\n    return 0;\n}`,
    c: `#include <stdio.h>\n\nint ${functionName}(${params.map(p => `int ${p}`).join(', ')}) {\n    // This function has a bug\n    return ${buggyReturn}; // Bug: fix this\n}\n\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", ${functionName}(a, b));\n    return 0;\n}`,
    csharp: `using System;\n\nclass Program {\n    static int ${functionName}(${params.map(p => `int ${p}`).join(', ')}) {\n        // This function has a bug\n        return ${buggyReturn}; // Bug: fix this\n    }\n    \n    static void Main() {\n        string[] input = Console.ReadLine().Split();\n        int a = int.Parse(input[0]);\n        int b = int.Parse(input[1]);\n        Console.WriteLine(${functionName}(a, b));\n    }\n}`,
  };

  return templates[targetLanguage] || pythonCode;
};

export default function BranchPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = Number(params?.id);

  const [authResolved, setAuthResolved] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [problem, setProblem] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60 * 60);
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(true);
  const [testCases, setTestCases] = useState([]);
  const submissionsFetchWarned = useRef(false);
  
  // Undo/Redo history management
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const isUndoRedo = useRef(false);


  useEffect(() => {
    const savedTeamInfo = localStorage.getItem("team_info");
    if (!savedTeamInfo) {
      setAuthResolved(true);
      router.replace("/");
      return;
    }

    const info = JSON.parse(savedTeamInfo);
    setTeamInfo(info);
    setIsAuthenticated(true);

    const savedStartTime = localStorage.getItem("timer_start_time");
    if (savedStartTime) {
      const start = parseInt(savedStartTime, 10);
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, 60 * 60 - elapsed);
      setTimeRemaining(remaining);
      setTimerStartTime(start);
      if (remaining <= 0) {
        toast.error("Time is up!");
      }
    } else {
      const now = Date.now();
      setTimerStartTime(now);
      localStorage.setItem("timer_start_time", now.toString());
    }

    setAuthResolved(true);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated || !teamInfo) return;
    let cached = null;
    try {
      const stored = localStorage.getItem("problems_cache");
      if (stored) {
        cached = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to parse cached problems", error);
    }

    const trySetProblem = async (list) => {
      if (!Array.isArray(list)) return false;
      const found = list.find((p) => Number(p.id) === problemId);
      if (found) {
        setProblem(found);
        const pythonCode = found.buggy_file_blob || "";
        
        // Use template
        const initialLanguage = "python";
        setLanguage(initialLanguage);
        const templateCode = generateCodeTemplate(pythonCode, initialLanguage, problemId);
        resetHistory(); // Reset undo/redo history when loading template
        setCode(templateCode);
        setStdin(""); // Clear stdin - user will provide their own input
        return true;
      }
      return false;
    };

    const initializeProblem = async () => {
      if (cached) {
        const result = await trySetProblem(cached);
        if (result) {
          setLoadingProblem(false);
          return;
        }
      }

      setLoadingProblem(true);
      try {
        const res = await fetch("/api/problems");
        if (!res.ok) throw new Error("Failed to load problems");
        const data = await res.json();
        localStorage.setItem("problems_cache", JSON.stringify(data));
        const result = await trySetProblem(data);
        if (!result) {
          toast.error("Challenge not found. Redirecting to the map.");
          router.replace("/");
        }
      } catch (error) {
        console.error(error);
        toast.error("Unable to load this challenge right now.");
      } finally {
        setLoadingProblem(false);
      }
    };

    initializeProblem();
  }, [isAuthenticated, problemId, router, teamInfo]);

  // Fetch test cases when problem is loaded (only visible ones)
  useEffect(() => {
    if (!problem || !problem.id) return;

    const fetchTestCases = async () => {
      try {
        // Only fetch visible test cases (not hidden ones)
        const res = await fetch(`/api/testcases?problem_id=${problem.id}`);
        if (!res.ok) throw new Error("Failed to load test cases");
        const data = await res.json();
        setTestCases(data);
      } catch (error) {
        console.error("Failed to fetch test cases:", error);
      }
    };

    fetchTestCases();
  }, [problem]);


  useEffect(() => {
    if (!isAuthenticated || !teamInfo) return;

    const fetchSubmissions = async () => {
      try {
        const response = await fetch(
          `/api/submissions?team_id=${teamInfo.team_id}`
        );
        if (!response.ok) throw new Error("Failed to fetch submissions");
        const data = await response.json();
        const subs = {};
        data.forEach((sub) => {
          subs[sub.problem_id] = sub.status;
        });
        setSubmissions(subs);
        localStorage.setItem("submissions", JSON.stringify(subs));
      } catch (error) {
        if (!submissionsFetchWarned.current) {
          submissionsFetchWarned.current = true;
          toast.error("Unable to sync submissions. Showing last saved progress.");
        }
        const cached = localStorage.getItem("submissions");
        if (cached) {
          try {
            setSubmissions(JSON.parse(cached));
          } catch (parseError) {
            console.warn("Failed to parse cached submissions", parseError);
          }
        }
        console.warn("Failed to fetch submissions. Using cached data if available.", error);
      }
    };

    fetchSubmissions();
  }, [isAuthenticated, teamInfo]);

  useEffect(() => {
    if (!isAuthenticated || !timerStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      const remaining = Math.max(0, 60 * 60 - elapsed);
      setTimeRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        toast.error("Time is up!");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStartTime, isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem("team_info");
    localStorage.removeItem("timer_start_time");
    localStorage.removeItem("submissions");
    localStorage.removeItem("problems_cache");
    router.replace("/");
  };

  const handleOpenProblemPdf = async () => {
    const meta = branchMeta[problemId];
    const pdfPath = meta?.pdf;
    if (!pdfPath) {
      toast.error("Problem PDF not available yet.");
      return;
    }

    try {
      // Check if PDF exists in public folder
      const resp = await fetch(pdfPath, { method: "HEAD" });
      if (!resp.ok) throw new Error("Missing PDF");
      window.open(pdfPath, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Problem PDF not available yet. Please upload it to the public/problems/ folder.");
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      toast.error("Write or paste some code first.");
      return;
    }

    setIsRunning(true);
    setOutput("");
    try {
      // Check if code has hardcoded numeric values in print/function calls
      // Pattern: print(function_name(number, number)) or print(number)
      const hasHardcodedValues = /print\s*\([^)]*\d+[^)]*\)/.test(code);

      // Check if stdin reading code exists
      const hasStdinCode = code.includes("sys.stdin.readline()") ||
        code.includes("sys.stdin.read()") ||
        code.includes("input()") ||
        code.includes("Scanner") ||
        code.includes("cin") ||
        code.includes("scanf");

      // If code has hardcoded values in print statements, we need to provide stdin
      // to prevent the stdin reading line from failing, OR we need to detect if
      // the stdin reading is actually being used

      // Better approach: Check if the print statement comes AFTER stdin reading
      // and has hardcoded values - if so, stdin reading might fail
      const stdinLineIndex = code.indexOf("sys.stdin.readline()");
      const printLineIndex = code.lastIndexOf("print(");

      // If print with hardcoded values comes after stdin reading, stdin will be read first
      // So we need to provide stdin OR detect that stdin reading is not needed
      let useStdin = stdin || "";

      if (hasHardcodedValues && hasStdinCode) {
        // Check if stdin reading line is actually executed before the hardcoded print
        if (stdinLineIndex !== -1 && printLineIndex !== -1 && stdinLineIndex < printLineIndex) {
          // Stdin reading happens before print, so we need stdin to prevent error
          // But if stdin is empty and we have hardcoded values, the stdin line will fail
          // Solution: Provide a dummy stdin value to prevent the error
          if (!stdin.trim()) {
            // Provide minimal stdin to prevent unpacking error
            // For Python: provide at least the expected number of values
            if (code.includes("a, b =")) {
              useStdin = "0 0"; // Dummy values that won't affect hardcoded function call
            } else if (code.includes("a =") && !code.includes("a, b")) {
              useStdin = "0";
            } else {
              useStdin = "0 0"; // Default fallback
            }
          }
        }
      }

      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
          stdin: useStdin,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        // Hide actual error details
        throw new Error("Failed to execute code.");
      }

      // Handle different response formats from piston
      let runOutput = "";
      let hasError = false;
      
      // Check for compilation errors first
      if (data.compile) {
        if (data.compile.stderr) {
          // Compilation error - hide details
          hasError = true;
        } else if (data.compile.stdout) {
          runOutput = data.compile.stdout;
        } else if (data.compile.output) {
          runOutput = data.compile.output;
        }
      }
      
      // Check for runtime errors
      if (data.run) {
        if (data.run.stderr) {
          // Runtime error - hide details
          hasError = true;
        } else if (data.run.stdout) {
          runOutput = data.run.stdout;
        } else if (data.run.output) {
          runOutput = data.run.output;
        }
      }

      // If there's an error, show generic message instead of actual error
      if (hasError) {
        runOutput = "An error occurred while executing your code.";
      } else if (!runOutput && data.message) {
        runOutput = data.message;
      } else if (!runOutput) {
        runOutput = "No output produced.";
      }

      setOutput(runOutput);
    } catch (error) {
      console.error("Run error:", error);
      // Hide actual error details - show generic message
      setOutput("An error occurred while executing your code.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunTestCases = async () => {
    if (!code.trim()) {
      toast.error("Write or paste some code first.");
      return;
    }

    // Filter only visible test cases (not hidden)
    const visibleTestCases = testCases.filter(tc => !tc.is_hidden);

    if (!visibleTestCases || visibleTestCases.length === 0) {
      toast.error("No test cases available for this problem.");
      return;
    }

    setIsRunningTests(true);
    setOutput("");

    try {
      // Prepare test cases for batch request
      const testCasesForBatch = visibleTestCases.map(tc => ({
        input: tc.input_data || "",
        expected_output: tc.expected_output || ""
      }));

      // Send batch request
      const response = await fetch("/api/run-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          code,
          test_cases: testCasesForBatch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run test cases");
      }

      // Process results
      const results = data.results || [];
      let passedCount = 0;
      let failedCount = 0;

      const formattedResults = results.map((result, i) => {
        const passed = result.passed;
        if (passed) {
          passedCount++;
        } else {
          failedCount++;
        }

        return {
          testCase: i + 1,
          input: result.input,
          expected: result.expected_output,
          actual: result.error ? "Error occurred" : (result.actual_output || "(no output)"),
          passed,
        };
      });

      // Format output
      let outputText = `Test Results: ${passedCount}/${visibleTestCases.length} passed\n\n`;

      formattedResults.forEach((result) => {
        outputText += `Test Case ${result.testCase}:\n`;
        outputText += `  Input: ${result.input}\n`;
        outputText += `  Expected: ${result.expected}\n`;
        outputText += `  Got: ${result.actual}\n`;
        outputText += `  Status: ${result.passed ? "✅ PASSED" : "❌ FAILED"}\n\n`;
      });

      setOutput(outputText);

      if (passedCount === visibleTestCases.length) {
        toast.success(`All ${visibleTestCases.length} test cases passed! 🎉`);
      } else {
        toast.error(`${failedCount} test case(s) failed.`);
      }
    } catch (error) {
      console.error("Test cases error:", error);
      setOutput("An error occurred while running test cases.");
      toast.error("Failed to run test cases.");
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleSubmit = async () => {
    if (!problem || !code.trim()) {
      toast.error("Paste your corrected code before submitting.");
      return;
    }
    if (!teamInfo) {
      toast.error("Not authenticated");
      return;
    }

    const toastId = toast.loading("Submitting...");
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          problem_id: problem.id,
          team_id: teamInfo.team_id,
          code,
          language,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Submission failed");
      }

      if (data.status === "Accepted") {
        toast.success("Submission accepted!", { id: toastId });
        setSubmissions((prev) => ({
          ...prev,
          [problem.id]: "Accepted",
        }));
      } else {
        toast.error(`Submission failed: ${data.status || "try again"}`, {
          id: toastId,
        });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.message || "Something went wrong.", { id: toastId });
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Format output with color coding
  const formatOutput = (outputText) => {
    if (!outputText) return null;

    // Check if it's our generic error message (errors are already hidden)
    if (outputText.includes("An error occurred") || outputText.includes("Error occurred")) {
      return <span className={styles.outputError}>{outputText}</span>;
    }

    // Check for warnings
    if (outputText.includes("Warning:") || outputText.includes("warning")) {
      return <span className={styles.outputWarning}>{outputText}</span>;
    }

    // Success output (normal output)
    return <span className={styles.outputSuccess}>{outputText}</span>;
  };

  // Generate line numbers for code editor
  const generateLineNumbers = (codeText) => {
    const lines = codeText.split('\n').length || 1;
    return Array.from({ length: Math.max(lines, 20) }, (_, i) => i + 1).join('\n');
  };

  // Sync line numbers scroll with code editor
  const codeEditorRef = useRef(null);
  const lineNumbersRef = useRef(null);

  const handleCodeScroll = (e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Handle code changes with undo/redo support
  const handleCodeChange = (newCode) => {
    if (isUndoRedo.current) {
      // Don't add to history if this is an undo/redo operation
      setCode(newCode);
      return;
    }

    // Clear redo stack when new change is made
    redoStack.current = [];
    
    // Add current code to undo stack before updating
    if (code !== newCode) {
      undoStack.current.push(code);
      
      // Limit history size to prevent memory issues (keep last 50 states)
      if (undoStack.current.length > 50) {
        undoStack.current.shift();
      }
    }

    setCode(newCode);
  };

  // Undo function
  const handleUndo = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (undoStack.current.length === 0) {
      return;
    }

    // Move current code to redo stack
    redoStack.current.push(code);
    
    // Get previous state from undo stack
    const previousCode = undoStack.current.pop();
    
    isUndoRedo.current = true;
    setCode(previousCode);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoRedo.current = false;
    }, 0);
  };

  // Redo function
  const handleRedo = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (redoStack.current.length === 0) {
      return;
    }

    // Move current code to undo stack
    undoStack.current.push(code);
    
    // Get next state from redo stack
    const nextCode = redoStack.current.pop();
    
    isUndoRedo.current = true;
    setCode(nextCode);
    
    // Reset flag after state update
    setTimeout(() => {
      isUndoRedo.current = false;
    }, 0);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      handleUndo(e);
    }
    // Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z for redo
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      handleRedo(e);
    }
  };

  // Reset history when code is set externally (e.g., language change)
  const resetHistory = () => {
    undoStack.current = [];
    redoStack.current = [];
  };

  const solvedCount = useMemo(
    () => Object.values(submissions).filter((status) => status === "Accepted").length,
    [submissions]
  );

  const solvedThisProblem = submissions[problemId] === "Accepted";
  const meta = branchMeta[problemId] || branchMeta[6];

  if (!authResolved) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Toaster />
      <header className={styles.topBar}>
        <div className={styles.topBarContent}>
          <div className={styles.leftGroup}>
            <button className={styles.backButton} onClick={() => router.push("/")}>
              <span className={styles.backIcon}>←</span>
              <span>Map</span>
            </button>
            <div className={styles.divider}></div>
            <div className={styles.teamInfo}>
              <span className={styles.teamName}>{teamInfo?.team_name || "Team"}</span>
            </div>
            <div className={styles.solvedBadge}>
              <span className={styles.solvedCount}>{solvedCount} / 6</span>
              <span className={styles.solvedLabel}>Solved</span>
            </div>
          </div>
          <div className={styles.centerGroup}>
            <div className={styles.timerCluster}>
              <span className={styles.timerLabel}>Time Remaining</span>
              <span
                className={
                  timeRemaining < 300 ? styles.timerWarning : styles.timerValue
                }
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>
          <div className={styles.rightGroup}>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className={styles.stage}>
        <div className={styles.background}>
          {meta?.image ? (
            <Image
              src={meta.image}
              alt={`${meta.nickname} arena`}
              fill
              priority
              style={{ objectFit: "cover", objectPosition: "center" }}
              quality={100}
              unoptimized
            />
          ) : null}
        </div>
        <div className={styles.sceneOverlay} />

        <div className={styles.locationCard}>
          <div className={styles.cardBadge} style={{ borderColor: meta.accent }}>
            {problemNameMap[problemId]?.toUpperCase() || "CHALLENGE"}
          </div>
          <h1>{meta.title}</h1>
          <p>{meta.description}</p>
          <div className={styles.statusRow}>
            <div>
              <span className={styles.label}>Status</span>
              <span
                className={`${styles.statusPill} ${solvedThisProblem ? styles.statusSolved : styles.statusInProgress
                  }`}
              >
                {solvedThisProblem ? "Completed" : "In Progress"}
              </span>
            </div>
            <div>
              <span className={styles.label}>Language</span>
              <span className={styles.metaValue}>Multi-language</span>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.glassButton} onClick={handleOpenProblemPdf}>
              📜 Problem Scroll
            </button>
            <button
              className={`${styles.glassButton} ${showEditor ? styles.activeButton : ""
                }`}
              onClick={() => setShowEditor((prev) => !prev)}
            >
              💻 Code Editor
            </button>
          </div>
        </div>

        <button className={styles.hintButton} title="Hints">
          <span className={styles.hintIcon}>💡</span>
        </button>

        {showEditor && (
          <div
            className={styles.editorOverlay}
            onClick={(e) => {
              // Close when clicking on overlay (but not the editor itself)
              if (e.target === e.currentTarget) {
                setShowEditor(false);
              }
            }}
          >
            <div className={styles.editorShell} onClick={(e) => e.stopPropagation()}>
              <div className={styles.editorHeader}>
                <h2>Furious Five Debug Console</h2>
                <button
                  className={styles.closeEditor}
                  onClick={() => setShowEditor(false)}
                  aria-label="Close code editor"
                >
                  ×
                </button>
              </div>

              <div className={styles.languageSelector}>
                <div className={styles.languageTabs}>
                  {languageOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`${styles.languageTab} ${language === option.value ? styles.languageTabActive : ''}`}
                      onClick={() => {
                        const newLanguage = option.value;
                        setLanguage(newLanguage);
                        // Update code template when language changes
                        if (problem?.buggy_file_blob) {
                          const newCode = generateCodeTemplate(
                            problem.buggy_file_blob,
                            newLanguage,
                            problemId
                          );
                          resetHistory(); // Reset undo/redo history on language change
                          setCode(newCode);
                        }
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.editorLayout}>
                <div className={styles.codePane}>
                  <div className={styles.codePaneHeader}>
                    <span className={styles.codePaneHeaderTitle}>// Write Your Fix Here</span>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        className={styles.runButton}
                        onClick={handleRun}
                        disabled={isRunning || isRunningTests}
                        style={{ background: "linear-gradient(135deg, #14B8A6 0%, #00BFA5 100%)" }}
                      >
                        {isRunning ? "⏳ Running..." : "▶ Run"}
                      </button>
                      {testCases.length > 0 && (
                        <button
                          className={styles.runButton}
                          onClick={handleRunTestCases}
                          disabled={isRunning || isRunningTests}
                          style={{ background: "linear-gradient(135deg, #F5BB00 0%, #FF9900 100%)" }}
                        >
                          {isRunningTests ? "⏳ Testing..." : "🧪 Run Tests"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className={styles.codeEditorWrapper}>
                    <div className={styles.codeEditorContainer}>
                      <div
                        ref={lineNumbersRef}
                        className={styles.lineNumbers}
                      >
                        {generateLineNumbers(code)}
                      </div>
                      <textarea
                        ref={codeEditorRef}
                        className={styles.codeEditor}
                        value={code}
                        onChange={(e) => handleCodeChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onScroll={handleCodeScroll}
                        spellCheck={false}
                        placeholder="// Start coding here..."
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.outputPane}>
                  <div className={styles.outputPaneHeader}>
                    <span className={styles.outputPaneHeaderTitle}>Output</span>
                  </div>
                  <pre className={styles.outputWindow}>
                    {output ? formatOutput(output) : (
                      <span style={{ color: '#64748B', fontStyle: 'italic' }}>
                        — Output will appear here —
                      </span>
                    )}
                  </pre>
                  <div className={styles.customInput}>
                    <label htmlFor="stdin">Custom Input (Optional)</label>
                    <textarea
                      id="stdin"
                      value={stdin}
                      onChange={(e) => setStdin(e.target.value)}
                      placeholder="Enter input values here (e.g., '2 3' for two numbers, or leave empty if your code doesn't need input)..."
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.editorFooter}>
                <button
                  className={styles.submitButton}
                  onClick={handleSubmit}
                  disabled={solvedThisProblem} // Disable if already solved
                  style={{
                    cursor: solvedThisProblem ? 'not-allowed' : 'pointer',
                    backgroundColor: solvedThisProblem ? '#9CA3AF' : '', // gray out if solved
                  }}
                >
                  {solvedThisProblem ? "Already Submitted!" : "Submit to Judge"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingProblem && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingCard}>Loading challenge…</div>
          </div>
        )}
      </main>
    </div>
  );
}

