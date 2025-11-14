import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

const USER_TYPES = [
  {
    id: 'student',
    label: 'Student',
    description: 'Access peer support, guided journaling, and mood trackers.'
  },
  {
    id: 'therapist',
    label: 'Therapist',
    description: 'Connect with students, review sessions, and share resources.'
  },
  {
    id: 'admin',
    label: 'Administrator',
    description: 'Manage platform settings, permissions, and analytics.'
  }
];

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [userType, setUserType] = useState(USER_TYPES[0]?.id ?? 'student');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeUserLabel = USER_TYPES.find((type) => type.id === userType)?.label ?? 'member';

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
    setErrors((prev) => ({
      ...prev,
      [field]: ''
    }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.email.trim()) {
      nextErrors.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      
      // Call the onLogin callback if provided
      if (onLogin) {
        onLogin({ userType, ...formData });
      }

      // Navigate based on user type
      switch (userType) {
        case 'student':
          navigate('/student-dashboard', { replace: true });
          break;
        case 'therapist':
          navigate('/therapist-dashboard', { replace: true });
          break;
        case 'admin':
          navigate('/admin-dashboard', { replace: true });
          break;
        default:
          navigate('/student-dashboard', { replace: true });
      }
    }, 600);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <header className="login-header">
          <h1>Welcome back to SafeTalk</h1>
          <p>Your confidential space for mental health support.</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <fieldset className="user-type-group">
            <legend>Continue as</legend>
            <div className="user-type-options">
              {USER_TYPES.map(({ id, label, description }) => (
                <label
                  key={id}
                  className={`user-type-option${userType === id ? ' active' : ''}`}
                >
                  <input
                    type="radio"
                    name="userType"
                    value={id}
                    checked={userType === id}
                    onChange={(event) => setUserType(event.target.value)}
                  />
                  <div>
                    <span className="user-type-label">{label}</span>
                    <span className="user-type-description">{description}</span>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          <label className={`input-group${errors.email ? ' has-error' : ''}`}>
            <span className="input-label">Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange('email')}
              autoComplete="email"
            />
            {errors.email ? <span className="error-message">{errors.email}</span> : null}
          </label>

          <label className={`input-group${errors.password ? ' has-error' : ''}`}>
            <span className="input-label">Password</span>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange('password')}
              autoComplete="current-password"
            />
            {errors.password ? (
              <span className="error-message">{errors.password}</span>
            ) : null}
          </label>

          <div className="form-actions">
            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : `Continue as ${activeUserLabel}`}
            </button>
            <Link to="/forgot-password" className="link-btn">
              Forgot password?
            </Link>
          </div>
        </form>

        <footer className="login-footer">
          <p>
            New to SafeTalk? <Link to="/signup">Create a confidential account</Link>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
