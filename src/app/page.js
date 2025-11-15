"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import Image from "next/image";
import Landing from "./landing";
import Login from "./login";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [showLanding, setShowLanding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const submissionsFetchWarned = useRef(false);
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes in seconds
  const [timerStartTime, setTimerStartTime] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const problemMap = {
    1: "mantis",
    2: "monkey",
    3: "viper",
    4: "crane",
    5: "tigress",
    6: "shifu",
  };

  // Check if user should see landing page
  useEffect(() => {
    const hasSeenLanding = sessionStorage.getItem("hasSeenLanding");
    if (hasSeenLanding) {
      setShowLanding(false);
      // If landing is already seen, we can check auth immediately
      // This will be handled by the auth useEffect below
    } else {
      // If landing hasn't been seen, mark auth as checked so we don't show login
      setAuthChecked(true);
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    if (showLanding) {
      setAuthChecked(true);
      return; // Don't check auth if showing landing
    }

    const savedTeamInfo = localStorage.getItem("team_info");
    if (savedTeamInfo) {
      try {
        const info = JSON.parse(savedTeamInfo);
        // Check timer before authenticating to avoid flashing main UI when expired
        const savedStartTime = localStorage.getItem("timer_start_time");
        if (savedStartTime) {
          const startTime = parseInt(savedStartTime, 10);
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.max(0, 60 * 60 - elapsed);

          if (remaining <= 0) {
            // Session expired: clear stale data and show login
            localStorage.removeItem("team_info");
            localStorage.removeItem("timer_start_time");
            localStorage.removeItem("submissions");
            localStorage.removeItem("problems_cache");
            setIsAuthenticated(false);
            setTeamInfo(null);
            setTimeRemaining(60 * 60);
            setTimerStartTime(null);
            setAuthChecked(true);
            return;
          }

          setTimeRemaining(remaining);
          setTimerStartTime(startTime);
        } else {
          // No timer found: start a new one
          const now = Date.now();
          setTimerStartTime(now);
          localStorage.setItem("timer_start_time", now.toString());
        }

        setTeamInfo(info);
        setIsAuthenticated(true);

        // Restore submissions
        const savedSubmissions = localStorage.getItem("submissions");
        if (savedSubmissions) {
          try {
            setSubmissions(JSON.parse(savedSubmissions));
          } catch (e) {
            console.warn("Failed to parse submissions", e);
          }
        }
      } catch (error) {
        console.error("Failed to parse team info", error);
        localStorage.removeItem("team_info");
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }

    setAuthChecked(true);
  }, [showLanding]);

  // Fetch problems with caching
  useEffect(() => {
    if (isAuthenticated && !showLanding) {
      fetchProblems();
      if (teamInfo) {
        fetchSubmissions();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, teamInfo?.team_id, showLanding]);

  // Timer countdown
  useEffect(() => {
    if (!isAuthenticated || !timerStartTime || showLanding) return;

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

  const fetchProblems = async () => {
    // Check cache first
    const cached = localStorage.getItem("problems_cache");
    if (cached) {
      try {
        setProblems(JSON.parse(cached));
      } catch (e) {
        console.warn("Failed to parse cached problems", e);
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch("/api/problems", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("Failed to fetch problems");
      const data = await response.json();
      setProblems(data);
      // Cache problems
      localStorage.setItem("problems_cache", JSON.stringify(data));
    } catch (error) {
      if (error.name === "AbortError") {
        console.error("Request timeout while fetching problems");
        toast.error(
          "Backend connection timeout. Please check if the Python server is running."
        );
      } else {
        console.error("Failed to fetch problems:", error);
      }
    }
  };

  const fetchSubmissions = async () => {
    if (!teamInfo) return;

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
      // Persist submissions
      localStorage.setItem("submissions", JSON.stringify(subs));
    } catch (error) {
      if (!submissionsFetchWarned.current) {
        submissionsFetchWarned.current = true;
        toast.error("Unable to sync submissions. Showing last saved progress.");
      }
      const cached = localStorage.getItem("submissions");
      if (cached) {
        setSubmissions(JSON.parse(cached));
      }
      console.warn(
        "Failed to fetch submissions. Using cached data if available.",
        error
      );
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    const savedTeamInfo = localStorage.getItem("team_info");
    if (savedTeamInfo) {
      setTeamInfo(JSON.parse(savedTeamInfo));

      // Start timer
      const savedStartTime = localStorage.getItem("timer_start_time");
      if (!savedStartTime) {
        const now = Date.now();
        setTimerStartTime(now);
        localStorage.setItem("timer_start_time", now.toString());
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("team_info");
    localStorage.removeItem("timer_start_time");
    localStorage.removeItem("submissions");
    localStorage.removeItem("problems_cache");
    setIsAuthenticated(false);
    setTeamInfo(null);
    setSubmissions({});
    setTimeRemaining(60 * 60);
    setTimerStartTime(null);
  };

  const goToProblem = (problemId) => {
    router.push(`/branch/${problemId}`);
  };

  const isSolved = (problemId) => {
    return submissions[problemId] === "Accepted";
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const solvedCount = Object.values(submissions).filter(
    (status) => status === "Accepted"
  ).length;

  const handleLandingComplete = () => {
    sessionStorage.setItem("hasSeenLanding", "true");
    setShowLanding(false);
    // Login will show automatically since isAuthenticated is false
  };

  if (showLanding) {
    return <Landing onGetStarted={handleLandingComplete} />;
  }

  // Wait for auth check to complete before showing login
  if (!authChecked) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={styles.container}>
      <Toaster />

      {/* Top Bar with Timer */}
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <div className={styles.leftCluster}>
            <button
              className={styles.menuButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle problem list"
            >
              ☰
            </button>
            <div className={styles.teamInfo}>
              <span className={styles.teamName}>
                {teamInfo?.team_name || "Team"}
              </span>
              <span className={styles.solvedCount}>
                {solvedCount} / 6 Solved
              </span>
            </div>
          </div>
          <div className={styles.timerContainer}>
            <span className={styles.timerLabel}>Time Remaining:</span>
            <span
              className={
                timeRemaining < 300 ? styles.timerWarning : styles.timer
              }
            >
              {formatTime(timeRemaining)}
            </span>
          </div>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Floating Controls */}
      <div className={styles.floatingButtons}>
        <button
          className={styles.floatBtn}
          onClick={() => setShowLeaderboard(true)}
          title="Leaderboard"
        >
          🏆
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <button
          className={styles.closeButton}
          onClick={() => setSidebarOpen(false)}
        >
          ×
        </button>
        <h2>Problems</h2>
        <div className={styles.problemList}>
          {problems.map((problem, idx) => (
            <button
              key={problem.id}
              className={`${styles.problemButton} ${
                isSolved(problem.id) ? styles.solved : ""
              }`}
              onClick={() => goToProblem(problem.id)}
            >
              {problemMap[problem.id] || `Problem ${idx + 1}`}
              {isSolved(problem.id) && " ✓"}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className={styles.mapContainer}>
        <div className={styles.mapImage}>
          <Image
            src="/images/map_final.png"
            alt="Map"
            fill
            style={{ objectFit: "contain" }}
            quality={100}
            priority
          />
        </div>

        {/* Paths Overlay */}
        <div className={styles.pathsOverlay}>
          {problems.map((problem) => {
            if (!isSolved(problem.id)) {
              return null;
            }
            const pathId = `${problemMap[problem.id]}-path`;
            return (
              <div
                key={pathId}
                className={`${styles.pathContainer} ${styles.glow}`}
              >
                <svg
                  width="528"
                  height="567"
                  viewBox="0 0 528 567"
                  fill="none"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <g id="Group 1">
                    {pathId === "mantis-path" && (
                      <path
                        id="mantis-path"
                        d="M173.846 544.5L214.846 566L231.346 556.5L208.346 544.5L181.846 528.5L154.846 509.5L130.346 504L109.846 499.5H79.3456H27.8456H0.845642L6.34564 509.5H83.3456L124.846 515.5L147.846 523.5L173.846 544.5Z"
                        stroke="url(#glowGradient)"
                        strokeWidth="3"
                      />
                    )}
                    {pathId === "monkey-path" && (
                      <path
                        id="monkey-path"
                        d="M234.846 508.5L229.346 533L258.346 545.5L263.846 517.5L284.346 494L302.846 455.5V419L292.846 402.5L269.846 387L244.846 374.5L216.846 364.5L196.346 355L182.846 341.5L164.346 355L196.346 374.5L224.346 387L258.346 402.5L274.846 419V455.5L258.346 488.5L234.846 508.5Z"
                        stroke="url(#glowGradient)"
                        strokeWidth="3"
                      />
                    )}
                    {pathId === "viper-path" && (
                      <path
                        id="viper-path"
                        d="M348.846 454.5L306.346 462.5L312.346 483.5L348.846 473L375.846 462.5H422.346L461.846 454.5L456.346 443L422.346 448H390.346L348.846 454.5Z"
                        stroke="url(#glowGradient)"
                        strokeWidth="3"
                      />
                    )}
                    {pathId === "crane-path" && (
                      <path
                        id="crane-path"
                        d="M337.346 433.5L369.346 443L344.346 449.5L307.346 443L326.846 424.5L349.846 414L381.846 402.5L415.846 390L447.346 378L468.846 363V338.5V301L479.346 283.5L503.346 267L517.846 237H526.846V267L497.846 283.5L479.346 301L488.346 343.5L479.346 369.5L447.346 390L415.846 402.5L369.346 414L337.346 433.5Z"
                        stroke="url(#glowGradient)"
                        strokeWidth="3"
                      />
                    )}
                    {pathId === "tigress-path" && (
                      <path
                        id="tigress-path"
                        d="M226.346 334L214.846 363H233.846L240.846 349.5V316.5V287.5L233.846 256.5L226.346 241H201.346L169.346 221L139.346 200.5L103.846 186L65.8456 194L38.8456 205.5L19.8456 221L30.3456 230.5L65.8456 205.5H92.3456H127.846L145.346 221L169.346 241L201.346 250.5L214.846 256.5V282.5L226.346 303V334Z"
                        stroke="url(#glowGradient)"
                        strokeWidth="3"
                      />
                    )}
                    {pathId === "shifu-path" && (
                      <path
                        id="shifu-path"
                        d="M257.346 221L231.346 235.5V252.5L264.846 239L287.346 221L295.846 205.5L279.346 181L257.346 167.5L237.846 158V134L243.846 115.5L268.846 85.5L279.346 75V56.5L268.846 31.5L243.846 26.5V0.5H231.346V26.5L257.346 41L268.846 56.5L257.346 85.5L231.346 108L217.846 134L211.846 153L231.346 181L257.346 193L273.846 200.5L257.346 221Z"
                        stroke="url(#glowGradient)"
                        strokeWidth="3"
                        fill="none"
                      />
                    )}
                    <defs>
                      <linearGradient
                        id="glowGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#ffe082" />
                        <stop offset="100%" stopColor="#ff6f61" />
                      </linearGradient>
                    </defs>
                  </g>
                </svg>
              </div>
            );
          })}
        </div>

        {/* Hotspots Overlay */}
        <div className={styles.hotspotsOverlay}>
          {problems.map((problem) => {
            const hotspotId = `${problemMap[problem.id]}-hotspot`;
            // Hotspot coordinates from the provided SVG (viewBox 804x759)
            // Note: monkey-hotspot is not in the SVG, using approximate position based on monkey-path
            const hotspots = {
              "mantis-hotspot": { cx: 97.5, cy: 686, rx: 80.5, ry: 73 },
              "monkey-hotspot": { cx: 252, cy: 527.5, rx: 99, ry: 54.5 },
              "viper-hotspot": { cx: 699, cy: 666, rx: 92, ry: 76 },
              "crane-hotspot": { cx: 709.5, cy: 378, rx: 94.5, ry: 95 },
              "tigress-hotspot": { cx: 89, cy: 423.5, rx: 89, ry: 72.5 },
              "shifu-hotspot": { cx: 397, cy: 123.5, rx: 183, ry: 123.5 },
            };
            const coords = hotspots[hotspotId];
            if (!coords) return null;

            return (
              <div
                key={hotspotId}
                className={styles.hotspot}
                style={{
                  position: "absolute",
                  left: `${(coords.cx / 804) * 100}%`,
                  top: `${(coords.cy / 759) * 100}%`,
                  width: `${((coords.rx * 2) / 804) * 100}%`,
                  height: `${((coords.ry * 2) / 759) * 100}%`,
                }}
                onClick={() => goToProblem(problem.id)}
                title={problem.title}
              />
            );
          })}
        </div>
      </div>
      {/* Leaderboard Modal (placeholder local view) */}
      {showLeaderboard && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button
              className={styles.popupClose}
              onClick={() => setShowLeaderboard(false)}
            >
              ×
            </button>
            <h2>Leaderboard</h2>
            <div className={styles.leaderboard}>
              <div className={styles.leaderRow}>
                <span className={styles.leaderTeam}>
                  {teamInfo?.team_name || "Your Team"}
                </span>
                <span className={styles.leaderSolved}>
                  {solvedCount} solved
                </span>
                <span className={styles.leaderTime}>
                  {formatTime(timeRemaining)} left
                </span>
              </div>
              <div className={styles.leaderInfoNote}>
                Live global leaderboard can plug into a backend endpoint later.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
