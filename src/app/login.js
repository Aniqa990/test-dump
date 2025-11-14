"use client"

import { useRef, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Image from 'next/image';
import styles from './login.module.css';

// Version number - increment this when you update login.png to force cache refresh
const IMAGE_VERSION = '1';

export default function Login({ onLogin }) {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationCompletedRef = useRef(false);
  const videoRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const sanitizedTeamName = teamName.trim();
    const sanitizedPassword = password.trim();

    if (!sanitizedTeamName || !sanitizedPassword) {
      toast.error('Please enter team name and password');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Logging in...');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: sanitizedTeamName,
          password: sanitizedPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      toast.success('Login successful!', { id: toastId });
      
      // Store team info in localStorage
      localStorage.setItem('team_info', JSON.stringify({
        team_id: data.team_id,
        team_name: data.team_name
      }));

      // Trigger success animation before navigating
      startSuccessAnimation();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || 'Invalid credentials', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const startSuccessAnimation = () => {
    if (animationCompletedRef.current) {
      onLogin();
      return;
    }

    setIsAnimating(true);

    requestAnimationFrame(() => {
      if (videoRef.current) {
        const playPromise = videoRef.current.play();
        if (playPromise?.catch) {
          playPromise.catch(() => handleAnimationEnd());
        }
      }
    });

    // Safety timeout in case onEnded never fires
    setTimeout(() => {
      if (!animationCompletedRef.current) {
        handleAnimationEnd();
      }
    }, 8000);
  };

  const handleAnimationEnd = () => {
    if (animationCompletedRef.current) return;
    animationCompletedRef.current = true;
    setIsAnimating(false);
    onLogin();
  };

  return (
    <div className={styles.container}>
      <Toaster />
      <div className={styles.background}>
        <Image
          src={`/images/login.png?v=${IMAGE_VERSION}`}
          alt="Jade Palace courtyard"
          fill
          priority
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          unoptimized
          quality={100}
          sizes="100vw"
        />
      </div>
      <div className={styles.backdropOverlay} />
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Code Debugging Competition</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="teamName">Team Name:</label>
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              autoComplete="username"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submitButton}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      {isAnimating && (
        <div className={styles.animationOverlay}>
          <video
            ref={videoRef}
            className={styles.successVideo}
            src="/animations/Game_Login_Animation_Generation.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleAnimationEnd}
            onError={handleAnimationEnd}
          />
        </div>
      )}
    </div>
  );
}

