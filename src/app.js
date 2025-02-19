// App.js
import React, { useEffect, useState } from 'react';
import MainRouter from './MainRouter';
import { supabase } from './supabaseClient';

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
    <MainRouter 
      user={authState.user} 
      session={authState.session} 
    />
  );
};

export default App;