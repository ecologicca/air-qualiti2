// App.js
import React, { useEffect, useState } from 'react';
import MainRouter from './MainRouter';
import { supabase } from './supabaseClient';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import UserPreferences from './UserPreferences';
import Dashboard from './Dashboard';

const App = () => {
  const [authState, setAuthState] = useState({
    user: null,
    session: null,
    loading: true
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user || null,
        session: session,
        loading: false
      });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user || null,
        session: session,
        loading: false
      });
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (authState.loading) {
    return (
      <div className="loading-container">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/preferences" element={<UserPreferences />} />
        <Route path="/user-preferences" element={<UserPreferences />} />
        <Route path="/UserPreferences" element={<UserPreferences />} />
        <Route path="/" element={
          <MainRouter 
            user={authState.user} 
            session={authState.session} 
          />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;