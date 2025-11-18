import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import './InitialAssessment.css';

const ADJECTIVES = ['Anonymous', 'Clever', 'Quiet', 'Brave', 'Calm', 'Gentle', 'Happy'];
const NOUNS = ['Panda', 'Koala', 'Bunny', 'Fox', 'Bear', 'Lion', 'Tiger', 'Sparrow'];

const InitialAssessment = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({
    overallMood: '',
    challenges: [],
    therapyGoals: '',
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        alert('Please log in to continue.');
        navigate('/login');
        return;
      }

      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        alert('Please confirm your email address before proceeding. Check your inbox for the confirmation link.');
        navigate('/please-verify');
        return;
      }

      setUser(user);
    };
    fetchUser();
  }, [navigate]);

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    setAnswers(prevAnswers => {
      if (checked) {
        return { ...prevAnswers, challenges: [...prevAnswers.challenges, value] };
      } else {
        return { ...prevAnswers, challenges: prevAnswers.challenges.filter(challenge => challenge !== value) };
      }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [name]: value
    }));
  };

  const finalizeGoogleUserProfile = async (user) => {
    // Finalize profile for new Google users who don't have role/alias yet
    if (!user.user_metadata?.role) {
      const randomAdjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const randomNoun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      const generatedAlias = `${randomAdjective} ${randomNoun}`;

      await supabase.auth.updateUser({
        data: { 
          role: 'student', 
          alias: generatedAlias 
        }
      });
      
      localStorage.setItem('userAlias', generatedAlias);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('Could not identify user. Please try logging in again.');
      return;
    }

    try {
      // Step 1: Save assessment data
      const { error: assessmentError } = await supabase.from('assessments').insert({
        user_id: user.id,
        overall_mood: answers.overallMood,
        challenges: answers.challenges,
        therapy_goals: answers.therapyGoals
      });

      if (assessmentError) throw assessmentError;

      // Step 2: Finalize profile for new Google users
      await finalizeGoogleUserProfile(user);

      // Navigate to the user dashboard after submission
      navigate('/student-dashboard');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert(error.message || 'Failed to save assessment. Please try again.');
    }
  };
  
  const handleSkip = async () => {
    if (!user) {
      alert('Could not identify user. Please try logging in again.');
      return;
    }

    try {
      // Still finalize profile for Google users even if they skip
      await finalizeGoogleUserProfile(user);
      
      // Navigate directly to the dashboard without submitting data
      navigate('/student-dashboard');
    } catch (error) {
      console.error('Error finalizing profile:', error);
      // Still navigate even if profile finalization fails
      navigate('/student-dashboard');
    }
  };

  const challengesOptions = [
    'Academic Stress', 'Anxiety', 'Relationships', 'Family Issues', 
    'Depression', 'Time Management', 'Loneliness', 'Other'
  ];

  return (
    <div className="assessment-container">
      <div className="assessment-card">
        <div className="assessment-header">
          <h2>Welcome to SafeTalk!</h2>
          <p>Let's get started. Answering these questions helps your therapist understand your needs. This is a safe space, and you can skip this for now if you're not ready.</p>
        </div>
        
        {/* We can add a progress bar here in the future */}

        <form onSubmit={handleSubmit}>
          {/* ----- Question 1: Overall Mood ----- */}
          <fieldset className="form-section">
            <legend>How would you rate your overall mood recently?</legend>
            <div className="radio-group">
              {[1, 2, 3, 4, 5].map(num => (
                <label key={num} className="radio-label">
                  <input type="radio" name="overallMood" value={num} checked={answers.overallMood === String(num)} onChange={handleChange} required/>
                  <span>{num}</span>
                </label>
              ))}
            </div>
            <div className="scale-labels">
                <span>Very Low</span>
                <span>Very High</span>
            </div>
          </fieldset>

          {/* ----- Question 2: Areas of Concern ----- */}
          <fieldset className="form-section">
            <legend>What areas, if any, are you finding challenging?</legend>
            <div className="checkbox-group">
              {challengesOptions.map(option => (
                <label key={option} className="checkbox-label">
                  <input type="checkbox" name="challenges" value={option} checked={answers.challenges.includes(option)} onChange={handleCheckboxChange} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          
          {/* ----- Question 3: Therapy Goals ----- */}
          <fieldset className="form-section">
            <legend>Is there anything specific you hope to achieve with therapy?</legend>
            <textarea
              name="therapyGoals"
              value={answers.therapyGoals}
              onChange={handleChange}
              rows="4"
              placeholder="e.g., 'Learn coping strategies for anxiety', 'Improve my relationships'..."
            ></textarea>
          </fieldset>

          <div className="assessment-actions">
            <button type="submit" className="submit-btn">Submit & Continue</button>
            <button type="button" onClick={handleSkip} className="skip-btn">Skip for now</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InitialAssessment;