import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useNavigate } from 'react-router-dom';
import './styles.css';

const Questionnaire = () => {
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setError("Error fetching user: " + error.message);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const preferences = { city, has_HVAC: hasHVAC, has_ecologgica: hasEcologica };

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ ...preferences, user_id: (await supabase.auth.getUser()).data.user.id });
      if (error) {
        setError("Error submitting preferences: " + error.message);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
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
