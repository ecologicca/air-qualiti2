// App.js
import React, { useEffect, useState } from 'react';
import MainRouter from './MainRouter';
import { supabase } from './supabaseClient';

const App = () => {
  const [user, setUser] = useState(null); // State to hold user information
  const [loading, setLoading] = useState(true); // State to track loading

  useEffect(() => {
    // Set up the auth state listener to track user authentication status
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && session.user) {
        setUser(session.user); // Set user when authenticated
      } else {
        setUser(null); // Clear user if logged out
      }
      setLoading(false); // Stop loading once the auth state is known
    });

    // Initial user fetch to see if a session already exists
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false); // Stop loading after checking session
    };

    checkUserSession();

    // Clean up listener on component unmount
    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading...</div>; // Show loading indicator if still checking auth

  return <MainRouter user={user} />; // Pass the user to MainRouter or other components
};

export default App;
