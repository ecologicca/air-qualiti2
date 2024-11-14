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
  const [error, setError] = useState(null);

  const checkUserSession = async () => {
    try {
      console.log("Checking user session...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Error fetching session:", sessionError.message);
        setUser(null);
        setHasPreferences(false);
        setLoading(false); // Ensure loading is set to false on error
        setError("User not authenticated or user ID is missing.");
        return;
      }
  
      if (sessionData && sessionData.session) {
        // If a session exists, set the user and check preferences
        const currentUser = sessionData.session.user;
        console.log("Session found for user ID:", currentUser.id);
        setUser(currentUser);
  
        // Check if the user has preferences
        const { data: preferences, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();
  
        if (preferencesError) {
          console.error("Error fetching user preferences:", preferencesError.message);
          setHasPreferences(false);
        } else {
          setHasPreferences(!!preferences); // Set based on whether preferences exist
        }
      } else {
        // No active session found
        console.log("No active session found or user ID is missing.");
        setUser(null);
        setHasPreferences(false);
        setError("User not authenticated or user ID is missing.");
      }
    } catch (error) {
      console.error("Unexpected error checking session:", error);
      setUser(null);
      setHasPreferences(false);
      setError("Unexpected error occurred while checking the session.");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);  // Ensure loading is set to false no matter what
    }
  };

  useEffect(() => {
    checkUserSession();

    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);  // Set loading to true while handling the state change
      if (session) {
        console.log("Auth state change detected: user logged in");
        checkUserSession();  // Re-check preferences on auth change
      } else {
        console.log("Auth state change detected: user logged out");
        setUser(null);
        setHasPreferences(false);
        setLoading(false); // Stop loading if user logged out
      }
    });

    // Cleanup the listener on unmount
    return () => authListener?.subscription.unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <p>{error}</p>;

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
          element={user && hasPreferences ? <Dashboard user={user} /> : <Navigate to="/questionnaire" />} />
      
        <Route path="/thankyou" element={<ThankYou />} />
        
        {/* Questionnaire should load only if preferences aren't set */}
        <Route
         path="/questionnaire" 
         element={user && !hasPreferences ? <Questionnaire user={user} /> : <Navigate to="/dashboard" />} />

        {/* User Preferences page accessible after setting initial preferences */}
        <Route path="/userpreferences" element={user ? <UserPreferences /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default MainRouter;
