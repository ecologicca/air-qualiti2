// MainRouter.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './Navbar';
import Login from './login';
import Signup from './signUp';
import Dashboard from './Dashboard';
import ThankYou from './ThankYou';
import WelcomePage from './WelcomePage';
import Questionnaire from './Questionnaire';
import UserPreferences from './UserPreferences';

const MainRouter = () => {
  const [user, setUser] = useState(null);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkUserSession = async () => {
    try {
      console.log("Checking user session...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Error fetching session:", sessionError.message);
        setUser(null);
        setHasPreferences(false);
        return;
      }

      if (sessionData?.session) {
        const currentUser = sessionData.session.user;
        console.log("Session found for user ID:", currentUser.id);  // Debugging log
        setUser(currentUser);

        // Check if user has preferences
        const { data: preferences, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('hasPreferences')
          .eq('user_id', currentUser.id)
          .single();

        if (preferencesError) {
          console.error("Error fetching user preferences:", preferencesError.message);
          setHasPreferences(false);
        } else {
          setHasPreferences(!!preferences);
        }
      } else {
        console.log("No active session found.");
        setUser(null);
        setHasPreferences(false);
      }
    } catch (error) {
      console.error("Unexpected error checking session:", error);
      setUser(null);
      setHasPreferences(false);
    } finally {
      console.log("Setting loading to false");
      setLoading(false);  // Ensure loading is set to false no matter what
    }
  };

  useEffect(() => {
    // Initial check for session when component mounts
    checkUserSession();

    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state change detected");
      setLoading(true);  // Set loading to true while handling the state change
      if (session) {
        console.log("User logged in with ID:", session.user.id);
        setUser(session.user);
        await checkUserSession();  // Re-check preferences on auth change
      } else {
        console.log("User logged out");
        setUser(null);
        setHasPreferences(false);
        setLoading(false);  // Set loading to false if user is logged out
      }
    });

    // Cleanup the listener on unmount
    return () => authListener?.subscription.unsubscribe();
  }, []);

  if (loading) {
    console.log("Still loading...");
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
        
        {/* Redirect to Questionnaire if preferences not set */}
        <Route
          path="/dashboard"
          element={user && hasPreferences ? <Dashboard /> : <Navigate to="/questionnaire" />}
        />
        <Route path="/thankyou" element={<ThankYou />} />
        
        {/* Questionnaire should load only if preferences aren't set */}
        <Route
          path="/questionnaire"
          element={user && !hasPreferences ? <Questionnaire /> : <Navigate to="/dashboard" />}
        />

        {/* User Preferences page accessible after setting initial preferences */}
        <Route path="/userpreferences" element={user ? <UserPreferences /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;
