import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const UserPreferences = () => {
  const [availableCities, setAvailableCities] = useState([
    'Toronto',
    'San Francisco',
    'New York',
    'Dallas',
    'Boston',
    'Miami',
    'Houston'
  ].sort());

  const [preferences, setPreferences] = useState({
    has_HVAC: false,
    has_ecologgica: false,
    first_name: '',
    last_name: '',
    city: 'Toronto',
    anxiety_base_level: 5, // Default middle value
    track_anxiety: false, // New checkbox state
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          setPreferences(data);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };

    fetchPreferences();
  }, [navigate]);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase
          .from('airqualitydata')
          .select('city')
          .order('city');
        
        if (error) {
          throw error;
        }

        if (data) {
          const uniqueCities = [...new Set(data.map(item => item.city))];
          setAvailableCities(uniqueCities);
        }
      } catch (error) {
        console.error('Error fetching cities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please log in to save preferences');
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id,
          has_HVAC: preferences.has_HVAC,
          has_ecologgica: preferences.has_ecologgica,
          first_name: preferences.first_name,
          last_name: preferences.last_name,
          city: preferences.city,
          anxiety_base_level: Number(preferences.anxiety_base_level),
          track_anxiety: preferences.track_anxiety
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
      
      alert('Preferences saved successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences: ' + error.message);
    }
  };

  return (
    <div className="preferences-container">
      <div className="preferences-content">
        <h1 className="preferences-title">User Preferences</h1>
        
        <form onSubmit={handleSave} className="preferences-form">
          <div className="form-group">
            <label>First Name:</label>
            <input
              type="text"
              value={preferences.first_name}
              onChange={(e) => setPreferences({ 
                ...preferences, 
                first_name: e.target.value 
              })}
            />
          </div>

          <div className="form-group">
            <label>Last Name:</label>
            <input
              type="text"
              value={preferences.last_name}
              onChange={(e) => setPreferences({ 
                ...preferences, 
                last_name: e.target.value 
              })}
            />
          </div>

          <div className="form-group">
            <label>City:</label>
            <select
              value={preferences.city}
              onChange={(e) => setPreferences({ 
                ...preferences, 
                city: e.target.value 
              })}
            >
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Base Anxiety Level (1-10):</label>
            <input
              type="range"
              min="1"
              max="10"
              value={preferences.anxiety_base_level}
              onChange={(e) => setPreferences({ 
                ...preferences, 
                anxiety_base_level: parseInt(e.target.value) 
              })}
              className="form-slider"
            />
            <span className="slider-value">{preferences.anxiety_base_level}</span>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.track_anxiety}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  track_anxiety: e.target.checked 
                })}
              />
              Track Anxiety Levels
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.has_HVAC}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  has_HVAC: e.target.checked 
                })}
              />
              Has HVAC
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={preferences.has_ecologgica}
                onChange={(e) => setPreferences({ 
                  ...preferences, 
                  has_ecologgica: e.target.checked 
                })}
              />
              Has Ecologgica Product
            </label>
          </div>

          <button type="submit" className="save-button">
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserPreferences;
