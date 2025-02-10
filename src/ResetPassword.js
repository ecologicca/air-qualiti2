import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setEmailSent(true);
      setError(null);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const { error: resetError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <div className="container form-container">
          <div className="success-message">
            Password successfully reset! Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="login-container">
        <div className="container form-container">
          <div className="success-message">
            Password reset instructions have been sent to your email.
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
            required
          />
          <button type="submit">Send Reset Instructions</button>
          {error && <p className="error">{error}</p>}
        </form>
        <button 
          className="back-to-login" 
          onClick={() => navigate('/login')}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword; 