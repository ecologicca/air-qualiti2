import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const UserPreferences = () => {
  const availableCities = [
    'Toronto',
    'San Francisco',
    'New York',
    'Dallas',
    'Boston',
    'Miami',
    'Houston'
  ].sort();

  const [preferences, setPreferences] = useState({ 
    has_HVAC: false, 
    has_ecologgica: false,
    first_name: '',
    last_name: '',
    city: 'Toronto'
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: preferencesData, error } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          if (preferencesData) {
            setPreferences({
              has_HVAC: preferencesData.has_HVAC || false,
              has_ecologgica: preferencesData.has_ecologgica || false,
              first_name: preferencesData.first_name || '',
              last_name: preferencesData.last_name || '',
              city: preferencesData.city || 'Toronto'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };

    fetchPreferences();
  }, []);

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

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        alert('Please log in to save preferences');
        return;
      }

      console.log('Attempting to save preferences:', {
        user_id: user.id,
        ...preferences
      });

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({ 
          user_id: user.id, 
          has_HVAC: preferences.has_HVAC, 
          has_ecologgica: preferences.has_ecologgica,
          first_name: preferences.first_name.trim(),
          last_name: preferences.last_name.trim(),
          city: preferences.city || 'Toronto'
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error('Detailed save error:', error);
        throw error;
      }

      console.log('Save successful:', data);
      alert('Preferences saved successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving preferences:', error.message);
      alert(`Failed to save preferences: ${error.message}`);
    }
  };

  return (
    <div className="container form-container">
      <h2>User Preferences</h2>
      <div>
        <label>
          First Name:
          <input
            type="text"
            value={preferences.first_name}
            onChange={(e) => setPreferences({ ...preferences, first_name: e.target.value })}
          />
        </label>
      </div>
      <div>
        <label>
          Last Name:
          <input
            type="text"
            value={preferences.last_name}
            onChange={(e) => setPreferences({ ...preferences, last_name: e.target.value })}
          />
        </label>
      </div>
      <div>
        <label>
          City:
          <select
            value={preferences.city}
            onChange={(e) => setPreferences({ ...preferences, city: e.target.value })}
            className="form-select"
          >
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <input
          type="checkbox"
          checked={preferences.has_HVAC}
          onChange={(e) => setPreferences({ ...preferences, has_HVAC: e.target.checked })}
        />
        Use HVAC
      </label>
      <label>
        <input
          type="checkbox"
          checked={preferences.has_ecologgica}
          onChange={(e) => setPreferences({ ...preferences, has_ecologgica: e.target.checked })}
        />
        Use Ecologica Product
      </label>
      <button onClick={handleSave}>Save Preferences</button>
    </div>
  );
};

export default UserPreferences;
