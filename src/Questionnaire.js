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

  // Fetch user and preferences when component mounts
  useEffect(() => {
    const fetchUserAndPreferences = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw new Error("Error fetching user: " + userError.message);
        }
        if (!userData?.user) {
          throw new Error("User not authenticated or user ID is missing");
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
          throw new Error("Error fetching preferences: " + preferencesError.message);
        }
        
        // If preferences are found, set the state accordingly
        if (preferences) {
          setCity(preferences.city);
          setHasHVAC(preferences.has_HVAC);
          setHasEcologica(preferences.has_ecologgica);
        }
      } catch (err) {
        console.error(err.message);
        setError(err.message);
      }
    };

    fetchUserAndPreferences();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Ensure user is authenticated before submission
    if (!user || !user.id) {
      const errorMessage = "User not authenticated or user ID is missing";
      console.error(errorMessage);
      setError(errorMessage);
      return;
    }

    console.log("Submitting preferences for user ID:", user.id);

    const preferences = { 
      city, 
      has_HVAC: hasHVAC, 
      has_ecologgica: hasEcologica, 
      user_id: user.id 
    };

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert(preferences, { onConflict: ['user_id'] });

      if (error) {
        throw new Error("Error submitting preferences: " + error.message);
      }

      // Redirect to the dashboard after successful submission
      navigate('/dashboard'); 
    } catch (err) {
      console.error(err.message);
      setError(err.message);
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
