import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
    } else if (data && data.user) {
      const userId = data.user.id;

      const { data: userPreferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // If no preferences found, redirect to questionnaire
      if (!userPreferences) {
        navigate('/questionnaire');
      } else {
        navigate('/dashboard'); // If preferences found, redirect to dashboard
      }
    } else {
      setError("Unable to retrieve user information.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetEmailSent(true);
      setError(null);
    }
  };

  return (
    <div className="login-container">
      <div className="container form-container">
        <h2>Login</h2>
        {resetEmailSent ? (
          <div className="success-message">
            Password reset instructions have been sent to your email.
            Please check your inbox and follow the link to reset your password.
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
            <button 
              type="button" 
              className="text-button"
              onClick={() => navigate('/reset-password')}
            >
              Forgot Password?
            </button>
            {error && <p className="error">{error}</p>}
          </form>
        )}
        <button className="signup-button" onClick={() => navigate('/signup')}>
          Sign Up
        </button>
      </div>
    </div>
  );
};

export default Login;
