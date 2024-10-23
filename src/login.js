import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    //Attempt to sign in with Supabase using email and password
    const { data,error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError(error.message);
    } else if (data && data.user) {
      // Fetch user preferences using the user ID
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      // If no preferences found, redirect to questionnaire
      if (!preferences) {
        navigate('/Questionnaire');
      } else {
        navigate('/app'); // If preferences found, redirect to dashboard
      }
    } else {
      setError ('User data not returned')
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
      {error && <p>{error}</p>}
    </form>
  );
};

export default Login;
