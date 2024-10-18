import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './login';
import Signup from './signUp';
import Dashboard from './app';
import ThankYou from './ThankYou';
import WelcomePage from './WelcomePage'; // Import the WelcomePage
import Questionnaire from './Questionnaire'; // Import Questionnaire

const MainRouter = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // User session check is delayed until the user clicks login/signup
  useEffect(() => {
    const checkUserSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        setUser(null);  // No session found, treat as logged out
      } else {
        setUser(data.session.user);  // Set the authenticated user from the session
      }
      setLoading(false);  // Stop loading
    };

    checkUserSession();
  }, []);

  if (loading) {
    return <div>Loading...</div>;  // Show a loading indicator while checking authentication
  }

  return (
    <Router>
      <Routes>
        {/* Welcome Page is the first route */}
        <Route path="/" element={<WelcomePage />} />

        {/* Redirect to Dashboard if user is authenticated */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />

        {/* Routes for after authentication */}
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/thankyou" element={<ThankYou />} />
        <Route path="/questionnaire" element={user ? <Questionnaire /> : <Navigate to="/login" />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;
