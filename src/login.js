import React, { useState, useEffect } from 'react';
import { supabase } from '/supabaseClient';
import { useHistory } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const history = useHistory();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error, user } = await supabase.auth.signIn({ email, password });
    if (error) {
      setError(error.message);
    } else {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // If no preferences found, redirect to questionnaire
      if (!data) {
        history.push('/questionnaire');
      } else {
        history.push('/dashboard'); // If preferences found, redirect to dashboard
      }
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
