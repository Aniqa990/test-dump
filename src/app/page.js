"use client"

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Image from 'next/image';
import Login from './login';
import styles from './page.module.css';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamInfo, setTeamInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [buggyCode, setBuggyCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [showSolutionSection, setShowSolutionSection] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes in seconds
  const [timerStartTime, setTimerStartTime] = useState(null);

  const problemMap = {
    1: 'mantis',
    2: 'monkey',
    3: 'viper',
    4: 'crane',
    5: 'tigress',
    6: 'shifu'
  };

  // Check authentication on mount
  useEffect(() => {
    const savedTeamInfo = localStorage.getItem('team_info');
    if (savedTeamInfo) {
      setTeamInfo(JSON.parse(savedTeamInfo));
      setIsAuthenticated(true);
      
      // Restore timer state
      const savedStartTime = localStorage.getItem('timer_start_time');
      if (savedStartTime) {
        const startTime = parseInt(savedStartTime);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 60 * 60 - elapsed);
        setTimeRemaining(remaining);
        setTimerStartTime(startTime);
      } else {
        // Start new timer
        const now = Date.now();
        setTimerStartTime(now);
        localStorage.setItem('timer_start_time', now.toString());
      }
      
      // Restore submissions
      const savedSubmissions = localStorage.getItem('submissions');
      if (savedSubmissions) {
        setSubmissions(JSON.parse(savedSubmissions));
      }
    }
  }, []);

  // Fetch problems with caching
  useEffect(() => {
    if (isAuthenticated) {
      fetchProblems();
      if (teamInfo) {
        fetchSubmissions();
      }
    }
  }, [isAuthenticated, teamInfo]);

  // Timer countdown
  useEffect(() => {
    if (!isAuthenticated || !timerStartTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      const remaining = Math.max(0, 60 * 60 - elapsed);
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        toast.error('Time is up!');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStartTime, isAuthenticated]);

  const fetchProblems = async () => {
    // Check cache first
    const cached = localStorage.getItem('problems_cache');
    if (cached) {
      setProblems(JSON.parse(cached));
      return;
    }

    try {
      const response = await fetch('/api/problems');
      if (!response.ok) throw new Error('Failed to fetch problems');
      const data = await response.json();
      setProblems(data);
      // Cache problems
      localStorage.setItem('problems_cache', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    }
  };

  const fetchSubmissions = async () => {
    if (!teamInfo) return;
    
    try {
      const response = await fetch(`/api/submissions?team_id=${teamInfo.team_id}`);
      if (!response.ok) throw new Error('Failed to fetch submissions');
      const data = await response.json();
      const subs = {};
      data.forEach(sub => {
        subs[sub.problem_id] = sub.status;
      });
      setSubmissions(subs);
      // Persist submissions
      localStorage.setItem('submissions', JSON.stringify(subs));
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    const savedTeamInfo = localStorage.getItem('team_info');
    if (savedTeamInfo) {
      setTeamInfo(JSON.parse(savedTeamInfo));
      
      // Start timer
      const savedStartTime = localStorage.getItem('timer_start_time');
      if (!savedStartTime) {
        const now = Date.now();
        setTimerStartTime(now);
        localStorage.setItem('timer_start_time', now.toString());
      }
    }
  };

  const handleHotspotClick = (problemId) => {
    const problem = problems.find(p => p.id === problemId);
    if (problem) {
      // Check if buggy_file_blob is a URL
      if (problem.buggy_file_blob && (problem.buggy_file_blob.startsWith('http://') || problem.buggy_file_blob.startsWith('https://'))) {
        // Open in new tab
        window.open(problem.buggy_file_blob, '_blank');
      } else {
        setBuggyCode(problem.buggy_file_blob);
        setSelectedProblem(problem);
        setShowSolutionSection(false);
        setCode('');
        setShowPopup(true);
      }
    }
  };

  const handleProblemSelect = (problemId) => {
    const problem = problems.find(p => p.id === problemId);
    if (problem) {
      // Check if buggy_file_blob is a URL
      if (problem.buggy_file_blob && (problem.buggy_file_blob.startsWith('http://') || problem.buggy_file_blob.startsWith('https://'))) {
        // Open in new tab
        window.open(problem.buggy_file_blob, '_blank');
        // Still show the submission form
        setSelectedProblem(problem);
        setBuggyCode('');
        setCode('');
        setLanguage('python');
        setShowSolutionSection(true);
        setShowPopup(true);
      } else {
        setBuggyCode(problem.buggy_file_blob);
        setSelectedProblem(problem);
        setCode('');
        setLanguage('python');
        setShowSolutionSection(true);
        setShowPopup(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedProblem || !code) {
      toast.error('Please provide code');
      return;
    }

    if (!teamInfo) {
      toast.error('Not authenticated');
      return;
    }

    const toastId = toast.loading('Submitting...');
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problem_id: selectedProblem.id,
          team_id: teamInfo.team_id,
          code,
          language
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      if (data.status === 'Accepted') {
        toast.success('Submission Accepted!', { id: toastId });
        setShowPopup(false);
        setCode('');
        setShowSolutionSection(false);
        fetchSubmissions();
      } else {
        toast.error(`Submission Failed: ${data.status || 'Unknown error'}`, { id: toastId });
      }
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.message || 'An unexpected error occurred.', { id: toastId });
    }
  };

  const isSolved = (problemId) => {
    return submissions[problemId] === 'Accepted';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const solvedCount = Object.values(submissions).filter(status => status === 'Accepted').length;

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={styles.container}>
      <Toaster />
      
      {/* Top Bar with Timer */}
      <div className={styles.topBar}>
        <div className={styles.topBarContent}>
          <div className={styles.teamInfo}>
            <span className={styles.teamName}>{teamInfo?.team_name || 'Team'}</span>
            <span className={styles.solvedCount}>{solvedCount} / 6 Solved</span>
          </div>
          <div className={styles.timerContainer}>
            <span className={styles.timerLabel}>Time Remaining:</span>
            <span className={timeRemaining < 300 ? styles.timerWarning : styles.timer}>{formatTime(timeRemaining)}</span>
          </div>
        </div>
      </div>
      
      {/* Hamburger Menu */}
      <button className={styles.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </button>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <button className={styles.closeButton} onClick={() => setSidebarOpen(false)}>×</button>
        <h2>Problems</h2>
        <div className={styles.problemList}>
          {problems.map((problem, idx) => (
            <button
              key={problem.id}
              className={`${styles.problemButton} ${isSolved(problem.id) ? styles.solved : ''}`}
              onClick={() => handleProblemSelect(problem.id)}
            >
              {problemMap[problem.id] || `Problem ${idx + 1}`}
              {isSolved(problem.id) && ' ✓'}
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
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Paths Overlay */}
        <div className={styles.pathsOverlay}>
          {problems.map((problem) => {
            const pathId = `${problemMap[problem.id]}-path`;
            return (
              <div
                key={pathId}
                className={`${styles.pathContainer} ${isSolved(problem.id) ? styles.glow : ''}`}
              >
                <svg width="528" height="567" viewBox="0 0 528 567" fill="none" preserveAspectRatio="xMidYMid meet">
                  <g id="Group 1">
                    {pathId === 'mantis-path' && <path id="mantis-path" d="M173.846 544.5L214.846 566L231.346 556.5L208.346 544.5L181.846 528.5L154.846 509.5L130.346 504L109.846 499.5H79.3456H27.8456H0.845642L6.34564 509.5H83.3456L124.846 515.5L147.846 523.5L173.846 544.5Z" stroke="white"/>}
                    {pathId === 'monkey-path' && <path id="monkey-path" d="M234.846 508.5L229.346 533L258.346 545.5L263.846 517.5L284.346 494L302.846 455.5V419L292.846 402.5L269.846 387L244.846 374.5L216.846 364.5L196.346 355L182.846 341.5L164.346 355L196.346 374.5L224.346 387L258.346 402.5L274.846 419V455.5L258.346 488.5L234.846 508.5Z" stroke="white"/>}
                    {pathId === 'viper-path' && <path id="viper-path" d="M348.846 454.5L306.346 462.5L312.346 483.5L348.846 473L375.846 462.5H422.346L461.846 454.5L456.346 443L422.346 448H390.346L348.846 454.5Z" stroke="white"/>}
                    {pathId === 'crane-path' && <path id="crane-path" d="M337.346 433.5L369.346 443L344.346 449.5L307.346 443L326.846 424.5L349.846 414L381.846 402.5L415.846 390L447.346 378L468.846 363V338.5V301L479.346 283.5L503.346 267L517.846 237H526.846V267L497.846 283.5L479.346 301L488.346 343.5L479.346 369.5L447.346 390L415.846 402.5L369.346 414L337.346 433.5Z" stroke="white"/>}
                    {pathId === 'tigress-path' && <path id="tigress-path" d="M226.346 334L214.846 363H233.846L240.846 349.5V316.5V287.5L233.846 256.5L226.346 241H201.346L169.346 221L139.346 200.5L103.846 186L65.8456 194L38.8456 205.5L19.8456 221L30.3456 230.5L65.8456 205.5H92.3456H127.846L145.346 221L169.346 241L201.346 250.5L214.846 256.5V282.5L226.346 303V334Z" stroke="white"/>}
                    {pathId === 'shifu-path' && <path id="shifu-path" d="M257.346 221L231.346 235.5V252.5L264.846 239L287.346 221L295.846 205.5L279.346 181L257.346 167.5L237.846 158V134L243.846 115.5L268.846 85.5L279.346 75V56.5L268.846 31.5L243.846 26.5V0.5H231.346V26.5L257.346 41L268.846 56.5L257.346 85.5L231.346 108L217.846 134L211.846 153L231.346 181L257.346 193L273.846 200.5L257.346 221Z" fill="#861A1A" stroke="white"/>}
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
              'mantis-hotspot': { cx: 97.5, cy: 686, rx: 80.5, ry: 73 },
              'monkey-hotspot': { cx: 252, cy: 527.5, rx: 99, ry: 54.5 },
              'viper-hotspot': { cx: 699, cy: 666, rx: 92, ry: 76 },
              'crane-hotspot': { cx: 709.5, cy: 378, rx: 94.5, ry: 95 },
              'tigress-hotspot': { cx: 89, cy: 423.5, rx: 89, ry: 72.5 },
              'shifu-hotspot': { cx: 397, cy: 123.5, rx: 183, ry: 123.5 }
            };
            const coords = hotspots[hotspotId];
            if (!coords) return null;

            return (
              <div
                key={hotspotId}
                className={styles.hotspot}
                style={{
                  position: 'absolute',
                  left: `${(coords.cx / 804) * 100}%`,
                  top: `${(coords.cy / 759) * 100}%`,
                  width: `${(coords.rx * 2 / 804) * 100}%`,
                  height: `${(coords.ry * 2 / 759) * 100}%`,
                }}
                onClick={() => handleHotspotClick(problem.id)}
                title={problem.title}
              />
            );
          })}
        </div>
      </div>

      {/* Buggy Code Popup */}
      {showPopup && selectedProblem && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <button className={styles.popupClose} onClick={() => {setShowPopup(false); setShowSolutionSection(false);}}>×</button>
            <h2>{selectedProblem.title}</h2>
            
            <div className={styles.popupContent} style={{gridTemplateColumns: showSolutionSection ? '1fr 1fr' : '1fr'}}>
              {buggyCode && (
                <div className={styles.buggyCodeSection}>
                  <h3>Buggy Code:</h3>
                  <pre className={styles.codeBlock}>{buggyCode}</pre>
                  {!showSolutionSection && (
                    <button 
                      onClick={() => setShowSolutionSection(true)}
                      className={styles.showSolutionButton}
                    >
                      Submit Your Solution
                    </button>
                  )}
                </div>
              )}
              
              {showSolutionSection && (
                <div className={styles.solutionSection}>
                  <h3>Your Solution:</h3>
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className={styles.languageSelect}
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                  </select>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={styles.codeInput}
                    placeholder="Paste your corrected code here..."
                    rows={15}
                  />
                  <button onClick={handleSubmit} className={styles.submitButton}>
                    Submit Solution
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
