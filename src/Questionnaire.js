import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const Questionnaire = () => {
  const [user, setUser] = useState(null);
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch user and preferences once when component mounts
  useEffect(() => {
    const fetchUserAndPreferences = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error("Error fetching user:", userError.message);
        setError("Error fetching user: " + userError.message);
        return;
      }
  
      if (!userData || !userData.user || !userData.user.id) {
        console.error("No user found or user ID is undefined");
        setError("User not authenticated or user ID is missing");
        return;
      }

      setUser(userData.user);  // Set user once

      console.log("Authenticated user ID:", userData.user.id);
  
      // Fetch preferences for the authenticated user
      const { data: preferences, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userData.user.id)
        .single();
  
      if (preferencesError) {
        console.error("Error fetching preferences:", preferencesError.message);
        setError("Error fetching preferences: " + preferencesError.message);
      } else if (preferences) {
        setCity(preferences.city);
        setHasHVAC(preferences.has_HVAC);
        setHasEcologica(preferences.has_ecologgica);
      }
    };
  
    fetchUserAndPreferences();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if user is set in state
    if (!user || !user.id) {
      setError("User not authenticated or user ID is missing");
      console.error("User not authenticated or user ID is missing");
      return;
    }

    console.log("Submitting preferences for user ID:", user.id);

    const preferences = { city, has_HVAC: hasHVAC, has_ecologgica: hasEcologica, user_id: user.id };

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(preferences, { onConflict: ['user_id'] });
        
      if (error) {
        console.error("Error submitting preferences:", error.message);
        setError("Error submitting preferences: " + error.message);
      } else {
        navigate('/dashboard'); // Redirect to the dashboard after successful submission
      }
    } catch (err) {
      console.error("Unexpected error submitting preferences:", err);
      setError("Unexpected error: " + err.message);
    }
  };  

  return (
    <div className="questionnaire-container">
      <div className="container form-container">
        <h2>Complete Your Preferences</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Select City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} required>
              <option value="">Select a city</option>
              <option value="Toronto">Toronto</option>
              <option value="New York">New York</option>
              <option value="San Francisco">San Francisco</option>
              <option value="Dallas">Dallas</option>
              <option value="Boston">Boston</option>
              <option value="Miami">Miami</option>
              <option value="Houston">Houston</option>
            </select>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={hasHVAC}
                onChange={(e) => setHasHVAC(e.target.checked)}
              />
              Do you have HVAC?
            </label>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={hasEcologica}
                onChange={(e) => setHasEcologica(e.target.checked)}
              />
              Do you have an Ecologica product?
            </label>
          </div>
          <button type="submit">Submit Preferences</button>
        </form>
      </div>
    </div>
  );
};

export default Questionnaire;
