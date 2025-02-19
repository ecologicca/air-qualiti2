import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Send reset instructions directly - Supabase will handle email existence check
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        // If no error, assume email was sent successfully
        setResetEmailSent(true);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (resetEmailSent) {
    return (
      <div className="login-container">
        <div className="container form-container">
          <div className="success-message">
            If an account exists with this email, password reset instructions have been sent.
            Please check your inbox and follow the link to reset your password.
          </div>
          <button 
            className="back-to-login" 
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="container form-container">
        <h2>Reset Password</h2>
        <form onSubmit={handleSendResetEmail}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
          <button 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <button 
          className="back-to-login" 
          onClick={() => navigate('/login')}
          disabled={isLoading}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword; 