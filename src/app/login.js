"use client"

import { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import styles from './login.module.css';

export default function Login({ onLogin }) {
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teamName || !password) {
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
          team_name: teamName,
          password: password
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
      
      // Call onLogin to proceed to the main page
      onLogin();
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || 'Invalid credentials', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Toaster />
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
    </div>
  );
}

