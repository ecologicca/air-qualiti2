// MainRouter.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Navbar from './Navbar';
import Login from './Login';
import SignUp from './signUp';
import Dashboard from './Dashboard';
import ThankYou from './ThankYou';
import WelcomePage from './WelcomePage';
import Questionnaire from './Questionnaire';
import UserPreferences from './UserPreferences';
import ResetPassword from './ResetPassword';

const MainRouter = ({ user, session }) => {
  const [hasPreferences, setHasPreferences] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkUserSession = async () => {
    try {
      console.log("Checking user session...");
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Error fetching session:", sessionError.message);
        setHasPreferences(false);
        setLoading(false);
        return false; // Return false to indicate no valid session
      }
  
      if (sessionData && sessionData.session) {
        console.log("Session found for user ID:", sessionData.session.user.id);
  
        // Check if the user has preferences
        const { data: preferences, error: preferencesError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', sessionData.session.user.id)
          .single();
  
        if (preferencesError) {
          console.error("Error fetching user preferences:", preferencesError.message);
          setHasPreferences(false);
        } else {
          setHasPreferences(!!preferences);
        }
        return true; // Return true to indicate valid session
      } else {
        console.log("No active session found or user ID is missing.");
        setHasPreferences(false);
        setLoading(false);
        return false; // Return false to indicate no valid session
      }
    } catch (error) {
      console.error("Unexpected error checking session:", error);
      setHasPreferences(false);
      setLoading(false);
      return false; // Return false on error
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeSession = async () => {
      const hasValidSession = await checkUserSession();
      if (!hasValidSession && !loading) {
        console.log("No valid session, redirecting to login");
        // Instead of redirecting here, we'll let the router handle it
      }
    };

    initializeSession();

    // Listen for authentication state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        console.log("Auth state change detected: user logged in");
        checkUserSession();
      } else {
        console.log("Auth state change detected: user logged out");
        setHasPreferences(false);
        setLoading(false);
      }
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  // Function to check if route should be protected
  const ProtectedRoute = ({ children }) => {
    if (!user) {
      return <Navigate to="/Login" replace />;
    }
    return children;
  };

  // Function to check if user should be redirected from auth pages
  const AuthRoute = ({ children }) => {
    if (user) {
      return <Navigate to="/dashboard" replace />;
    }
    return children;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route 
          path="/Login" 
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <AuthRoute>
              <SignUp />
            </AuthRoute>
          } 
        />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/questionnaire"
          element={
            <ProtectedRoute>
              <Questionnaire />
            </ProtectedRoute>
          }
        />
        <Route
          path="/userpreferences"
          element={
            <ProtectedRoute>
              <UserPreferences />
            </ProtectedRoute>
          }
        />

        {/* Default route */}
        <Route 
          path="/" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  );
};

export default MainRouter;
