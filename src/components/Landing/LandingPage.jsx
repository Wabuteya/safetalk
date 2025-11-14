import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="header">
        <nav className="navbar">
          <div className="logo">SafeTalk</div>
          <ul className="nav-links">
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <a href="#contact">Contact</a>
            </li>
          </ul>
          <div className="auth-buttons">
            <button className="login-btn" onClick={() => navigate('/login')}>
              Login
            </button>
            <button className="signup-btn" onClick={() => navigate('/signup')}>
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <h1>Your Safe Space for Mental Wellness</h1>
            <p>
              Connecting university students with therapists for confidential and compassionate support.
            </p>
            <button className="cta-button" onClick={() => navigate('/signup')}>
              Get Started
            </button>
          </div>
        </section>

        <section id="features" className="features-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Anonymous Journaling</h3>
              <p>
                Express your thoughts and feelings privately. You control what you share with your therapist.
              </p>
            </div>
            <div className="feature-card">
              <h3>Mood Tracking</h3>
              <p>Monitor your emotional well-being over time to identify patterns and progress.</p>
            </div>
            <div className="feature-card">
              <h3>Secure Chat</h3>
              <p>Connect with professional university therapists through confidential chat sessions.</p>
            </div>
            <div className="feature-card">
              <h3>Crisis Support</h3>
              <p>Immediate alerts and connections to support services when you need them most.</p>
            </div>
          </div>
        </section>

        <section id="about" className="about-section">
          <h2>About SafeTalk</h2>
          <p>
            SafeTalk is a dedicated platform designed to bridge the gap between students and mental health
            resources within the university environment. Our mission is to provide a secure, accessible, and
            supportive space for students to seek help and for therapists to offer their guidance.
          </p>
        </section>
      </main>

      <footer id="contact" className="footer">
        <p>&copy; 2025 SafeTalk. All rights reserved.</p>
        <p>Contact us: support@safetalk.university</p>
      </footer>
    </div>
  );
};

export default LandingPage;