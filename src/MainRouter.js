import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './Login';
import Signup from './Signup';
import Dashboard from './Dashboard';  // Your dashboard component

const MainRouter = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if the user is authenticated when the app loads
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        setUser(null);  // No user session
      } else {
        setUser(user);  // Set the authenticated user
      }
      setLoading(false);  // Stop loading
    };

    checkUser();

    // Listen for changes in authentication state
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);  // Set user when session is active
      } else {
        setUser(null);  // Reset user if session ends
      }
    });

    // Cleanup the auth state listener when the component unmounts
    return () => {
      authListener.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>;  // Show a loading indicator while checking authentication
  }

  return (
    <Router>
      <Routes>
        {/* Redirect to the Dashboard if the user is authenticated */}
        <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        
        {/* Login route */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        
        {/* Signup route */}
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />

        {/* Fallback route to login if route doesn't exist */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;
