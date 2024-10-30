import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';

const UserPreferences = () => {
  const [preferences, setPreferences] = useState({ has_HVAC: false, has_ecologgica: false });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPreferences = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user) {
        const { data: preferencesData } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (preferencesData) {
          setPreferences({
            has_HVAC: preferencesData.has_HVAC,
            has_ecologgica: preferencesData.has_ecologgica,
          });
        }
      }
    };

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    const { data: user } = await supabase.auth.getUser();
    await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, has_HVAC: preferences.has_HVAC, has_ecologgica: preferences.has_ecologgica });
    navigate('/dashboard');
  };

  return (
    <div className="container form-container">
      <h2>User Preferences</h2>
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
