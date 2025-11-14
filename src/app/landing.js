"use client"

import { useState, useEffect } from 'react';
import styles from './landing.module.css';

export default function Landing({ onGetStarted }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    }
  };

  return (
    <div className={styles.landingContainer}>
      <div className={`${styles.heroSection} ${isVisible ? styles.fadeIn : ''}`}>
        <div className={styles.backgroundOverlay} />
        
        <div className={styles.content}>
          <div className={styles.logoSection}>
            <div className={styles.eventBadge}>
              <span className={styles.acmText}>ACM SOCIETY PRESENTS</span>
            </div>
            <h1 className={styles.mainTitle}>CODE-FU</h1>
            <h2 className={styles.subtitle}>THE DEBUGGING TRIALS</h2>
            <div className={styles.titleUnderline} />
            <p className={styles.tagline}>
              Legend tells of a coder so skilled, even the bugs feared them.
            </p>
          </div>

          <p className={styles.description}>
            Part of <strong>Coders Cup '26</strong> - Master the art of debugging through the legendary styles of Kung Fu.
            Face challenges from Mantis, Monkey, Viper, Crane, and Tigress before
            confronting Master Shifu in the ultimate test.
          </p>

          <div className={styles.features}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🐛</div>
              <h3>Debug Challenges</h3>
              <p>Find and fix bugs in code across multiple languages</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚔️</div>
              <h3>Five Masters</h3>
              <p>Learn from each master's unique debugging style</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🏆</div>
              <h3>Compete</h3>
              <p>Race against time and climb the leaderboard</p>
            </div>
          </div>

          <button 
            className={styles.ctaButton}
            onClick={handleGetStarted}
          >
            Enter the Dojo
            <span className={styles.arrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

