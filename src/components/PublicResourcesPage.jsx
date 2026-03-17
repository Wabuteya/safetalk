import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LazyLottie } from './LazyLottie';
import './PublicResourcesPage.css';

const BREATHING_LOTTIE_PATH = '/Lottie/Deep%20Breathing.json';
const SOS_LOTTIE_PATH = '/Lottie/Sos%20animation.json';
const YOGA_LOTTIE_PATH = '/Lottie/yoga%20for%20life.json';
const STUDENT_BOOKS_LOTTIE_PATH = '/Lottie/Student%20with%20books.json';
const SLEEPING_LOTTIE_PATH = '/Lottie/Sleeping.json';
const MEDITATION_LOTTIE_PATH = '/Lottie/Meditation.json';
const RELAX_LOTTIE_PATH = '/Lottie/relax.json';

const LOTTIE_BY_CATEGORY = {
  coping: RELAX_LOTTIE_PATH,
  'exam-stress': STUDENT_BOOKS_LOTTIE_PATH,
  sleep: SLEEPING_LOTTIE_PATH,
  anxiety: MEDITATION_LOTTIE_PATH
};

const PublicResourcesPage = () => {
  const navigate = useNavigate();
  const [expandedCard, setExpandedCard] = useState(null);

  const toggleCard = (cardId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpandedCard((prevExpanded) => {
      // If clicking the same card, collapse it. Otherwise, expand the clicked card.
      const newExpanded = prevExpanded === cardId ? null : cardId;
      console.log('Toggle card:', { cardId, prevExpanded, newExpanded });
      return newExpanded;
    });
  };

  const selfHelpCategories = [
    {
      id: 'coping',
      icon: '💪',
      title: 'Coping Strategies',
      description: 'Quick techniques to help you manage stress and difficult moments.',
      tips: [
        'Take a break: Step away from stressful situations for 5-10 minutes',
        'Physical activity: A quick walk or stretch can reset your mind',
        'Talk to someone: Reach out to a friend, family member, or counselor',
        'Write it down: Journaling can help process difficult emotions',
        'Practice self-compassion: Be kind to yourself, especially during tough times'
      ]
    },
    {
      id: 'exam-stress',
      icon: '📚',
      title: 'Exam Stress',
      description: 'Practical tips to help you prepare and manage anxiety during exams.',
      tips: [
        'Plan ahead: Create a study schedule and stick to it',
        'Break it down: Study in 25-30 minute chunks with short breaks',
        'Stay organized: Keep notes and materials in order',
        'Get enough sleep: Aim for 7-9 hours, especially before exams',
        'Eat well: Nutritious meals fuel your brain',
        'Practice self-care: Don\'t neglect exercise, hobbies, or social time',
        'Remember: Your worth is not defined by your grades'
      ]
    },
    {
      id: 'sleep',
      icon: '😴',
      title: 'Sleep & Rest',
      description: 'Tips to improve sleep quality and rest.',
      tips: [
        'Consistent schedule: Go to bed and wake up at the same time daily',
        'Create a routine: Wind down 30-60 minutes before bed',
        'Limit screens: Avoid phones/computers 1 hour before sleep',
        'Comfortable environment: Keep your room cool, dark, and quiet',
        'Avoid caffeine: No coffee or energy drinks 6 hours before bed',
        'Relaxation techniques: Try meditation, reading, or gentle music',
        'If you can\'t sleep: Get up, do something calming, then try again'
      ]
    },
    {
      id: 'anxiety',
      icon: '🧘',
      title: 'Anxiety Basics',
      description: 'Strategies to understand and manage anxiety.',
      tips: [
        'Recognize triggers: Identify situations, thoughts, or events that increase your anxiety',
        'Practice deep breathing: Use the 4-7-8 technique or box breathing when anxiety rises',
        'Challenge negative thoughts: Question whether your anxious thoughts are realistic or helpful',
        'Stay present: Use grounding techniques (5-4-3-2-1 method) to anchor yourself in the moment',
        'Regular exercise: Physical activity helps reduce anxiety and improve mood',
        'Limit caffeine and alcohol: These can worsen anxiety symptoms',
        'Establish routines: Predictable daily routines can provide a sense of control and stability',
        'Seek support: Talk to friends, family, or a mental health professional when needed',
        'Practice self-compassion: Be gentle with yourself - anxiety is a normal human experience',
        'Consider professional help: If anxiety significantly impacts your life, therapy can be very effective'
      ]
    }
  ];

  return (
    <div className="public-resources-page">
      <header className="resources-header">
        <nav className="resources-navbar">
          <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            SafeTalk
          </div>
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

      <main className="resources-main">
        {/* Section 1: Hero / Immediate Support - Photo + UCU Blue Overlay */}
        <section className="support-section immediate-support">
          <div className="resources-container">
            <div className="section-header">
              <h2>Feeling overwhelmed right now?</h2>
              <p className="section-subtitle">Quick techniques you can use immediately</p>
            </div>
            <div className="support-grid">
              <div className="support-card support-card--with-sticker">
                <div className="support-card-sticker card-sticker">
                  <LazyLottie path={BREATHING_LOTTIE_PATH} loop={true} />
                </div>
                <h3>Breathing Exercise</h3>
                <div className="breathing-exercise">
                  <p><strong>4-7-8 Breathing Technique:</strong></p>
                  <ol>
                    <li>Inhale through your nose for 4 counts</li>
                    <li>Hold your breath for 7 counts</li>
                    <li>Exhale through your mouth for 8 counts</li>
                    <li>Repeat 3-4 times</li>
                  </ol>
                  <p className="tip">This technique helps activate your body's relaxation response and can reduce anxiety quickly.</p>
                </div>
              </div>

              <div className="support-card support-card--with-sticker">
                <div className="support-card-sticker card-sticker">
                  <LazyLottie path={YOGA_LOTTIE_PATH} loop={true} />
                </div>
                <h3>Grounding Technique</h3>
                <div className="grounding-technique">
                  <p><strong>5-4-3-2-1 Grounding Method:</strong></p>
                  <ol>
                    <li><strong>5 things</strong> you can see around you</li>
                    <li><strong>4 things</strong> you can touch or feel</li>
                    <li><strong>3 things</strong> you can hear</li>
                    <li><strong>2 things</strong> you can smell</li>
                    <li><strong>1 thing</strong> you can taste</li>
                  </ol>
                  <p className="tip">This technique helps bring you back to the present moment when you feel disconnected or overwhelmed.</p>
                </div>
              </div>

              <div className="support-card emergency-contacts support-card--with-sticker">
                <div className="support-card-sticker card-sticker">
                  <LazyLottie path={SOS_LOTTIE_PATH} loop={true} />
                </div>
                <h3>Emergency Contacts</h3>
                <div className="emergency-list">
                  <p><strong>If you're in immediate danger, call:</strong></p>
                  <ul>
                    <li><strong>Emergency Services:</strong> 911 (or your local emergency number)</li>
                    <li><strong>Crisis Text Line:</strong> Text HOME to 741741</li>
                    <li><strong>National Suicide Prevention Lifeline:</strong> 988</li>
                    <li><strong>University Counseling Center:</strong> Check your campus directory</li>
                  </ul>
                  <p className="important-note">
                    <strong>Remember:</strong> You are not alone. Help is available 24/7. Reach out if you need immediate support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Self-Help Tools - Solid #F0F4FF */}
        <section className="support-section self-help-tools">
          <div className="resources-container">
            <div className="section-header">
              <h2>Self-Help Tools</h2>
              <p className="section-subtitle">Explore strategies to support your mental well-being</p>
            </div>
            <div className="tools-grid">
              {selfHelpCategories.map((category) => {
                const isExpanded = expandedCard === category.id;
                const borderClass = ['coping', 'sleep'].includes(category.id) ? 'tool-card--blue' : 'tool-card--maroon';
                const lottiePath = LOTTIE_BY_CATEGORY[category.id];
                return (
                  <div 
                    key={category.id} 
                    className={`tool-card ${borderClass} ${isExpanded ? 'expanded' : ''} tool-card--with-sticker`}
                  >
                    {lottiePath && (
                      <div className="tool-card-sticker card-sticker">
                        <LazyLottie path={lottiePath} loop={true} />
                      </div>
                    )}
                    <div className="tool-card-header">
                      <div className="tool-card-content">
                        <h3>{category.title}</h3>
                        <p className="tool-description">{category.description}</p>
                      </div>
                    </div>
                    <button 
                      className="view-tips-btn"
                      onClick={(e) => toggleCard(category.id, e)}
                      aria-expanded={isExpanded}
                      type="button"
                    >
                      {isExpanded ? 'Hide tips ▴' : 'Show tips ▾'}
                    </button>
                    {isExpanded && expandedCard === category.id ? (
                      <div 
                        className="tool-tips" 
                        data-expanded="true" 
                        data-card-id={category.id}
                        key={`tips-${category.id}-${expandedCard}`}
                      >
                        <ul>
                          {category.tips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3: CTA - Solid UCU Blue */}
        <section className="cta-section">
            <div className="cta-container">
              <h2 className="cta-headline">Get personalized support tailored to you</h2>
              <p className="cta-description">
                Create a free account to access private journaling, mood tracking, and connect with university therapists in a secure, confidential space.
              </p>
              <div className="cta-actions">
                <button className="cta-primary-btn" onClick={() => navigate('/signup')}>
                  Create an Account
                </button>
                <button className="cta-secondary-link" onClick={() => navigate('/login')}>
                  Already have an account? Sign in
                </button>
              </div>
            </div>
        </section>
      </main>

      <footer className="resources-footer">
        <p className="footer-brand">SafeTalk</p>
        <p className="footer-copyright">&copy; 2026 SafeTalk. All rights reserved.</p>
        <p className="footer-contact">support@safetalk.university</p>
      </footer>
    </div>
  );
};

export default PublicResourcesPage;
