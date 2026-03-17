import { useNavigate } from 'react-router-dom';
import { LazyLottie } from '../LazyLottie';
import { FaGraduationCap, FaStethoscope, FaLock } from 'react-icons/fa';
import './Landing.css';

const PENCIL_LOTTIE_PATH = '/Lottie/pencil%20write%20on%20clipboard.json';
const MOOD_LOTTIE_PATH = '/Lottie/Emotional%20feedback%20emoji.json';
const CHAT_LOTTIE_PATH = '/Lottie/message.json';
const CRISIS_LOTTIE_PATH = '/Lottie/Mental%20Wellbeing%20-%20Seek%20Help.json';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <header className="header">
        <nav className="navbar">
          <div className="logo">
            <img src="/SafeTalk_Colour.svg" alt="SafeTalk" className="safetalk-logo" />
          </div>
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
              Sign In
            </button>
            <button className="signup-btn" onClick={() => navigate('/signup')}>
              Create Account
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
            <button className="cta-button" onClick={() => navigate('/resources')}>
              Explore Support Resources
            </button>
          </div>
        </section>

        <section id="features" className="features-section">
          <h2>Key Features</h2>
          <p className="features-subtitle">Everything you need to prioritize your mental wellbeing</p>
          <div className="features-grid">
            <div className="feature-card feature-card--with-sticker">
              <div className="feature-card-sticker card-sticker">
                <LazyLottie path={PENCIL_LOTTIE_PATH} loop={true} />
              </div>
              <h3>Anonymous Journaling</h3>
              <p>
                Express your thoughts and feelings privately. You control what you share with your therapist.
              </p>
            </div>
            <div className="feature-card feature-card--with-sticker">
              <div className="feature-card-sticker card-sticker">
                <LazyLottie path={MOOD_LOTTIE_PATH} loop={true} />
              </div>
              <h3>Mood Tracking</h3>
              <p>Monitor your emotional well-being over time to identify patterns and progress.</p>
            </div>
            <div className="feature-card feature-card--with-sticker">
              <div className="feature-card-sticker card-sticker">
                <LazyLottie path={CHAT_LOTTIE_PATH} loop={true} />
              </div>
              <h3>Secure Chat</h3>
              <p>Connect with professional university therapists through confidential chat sessions.</p>
            </div>
            <div className="feature-card feature-card--crisis feature-card--with-sticker">
              <div className="feature-card-sticker card-sticker">
                <LazyLottie path={CRISIS_LOTTIE_PATH} loop={true} />
              </div>
              <h3>Crisis Support</h3>
              <p>Immediate alerts and connections to support services when you need them most.</p>
            </div>
          </div>
        </section>

        <section id="about" className="about-section">
          <div className="about-logo">
            <img src="/SafeTalk_White.svg" alt="SafeTalk" className="safetalk-logo" />
          </div>
          <h2>About SafeTalk</h2>
          <p>
            SafeTalk is a dedicated platform designed to bridge the gap between students and mental health
            resources within the university environment. Our mission is to provide a secure, accessible, and
            supportive space for students to seek help and for therapists to offer their guidance.
          </p>
          <div className="about-stats">
            <div className="about-stat"><FaGraduationCap className="about-stat-icon" /> UCU Students</div>
            <div className="about-stat"><FaStethoscope className="about-stat-icon" /> Certified Therapists</div>
            <div className="about-stat"><FaLock className="about-stat-icon" /> 100% Confidential</div>
          </div>
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