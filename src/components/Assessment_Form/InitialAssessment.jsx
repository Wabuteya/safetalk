import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './InitialAssessment.css';

const InitialAssessment = () => {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({
    overallMood: '',
    challenges: [],
    therapyGoals: '',
  });

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

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real application, you would send this data to your backend API.
    console.log('Assessment Submitted:', answers);
    // Navigate to the user dashboard after submission.
    navigate('/student-dashboard'); 
  };
  
  const handleSkip = () => {
    // Navigate directly to the dashboard without submitting data.
    navigate('/student-dashboard');
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