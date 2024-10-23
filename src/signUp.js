import React, { useState } from 'react';
import { supabase } from './supabaseClient'; // Adjust path if needed
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      // Try to sign up the user
      const { error } = await supabase.auth.signUpWithPassword({ email, password });

      // Check if an error occurred
      if (error) {
        // Check if the email already exists in the system
        if (error.message === "User already registered") {
          setError("This email is already registered. Please log in.");
        } else {
          setError(error.message);  // Show any other errors
        }
      } else {
        // If successful, navigate to the Thank You page
        alert('Check your email for a confirmation link!');
        navigate('/thankyou');
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSignup}>
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
      <button type="submit">Sign Up</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
};

export default Signup;
