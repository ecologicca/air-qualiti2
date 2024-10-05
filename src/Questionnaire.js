import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const Questionnaire = () => {
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [error, setError] = useState(null);


  // Fetch the authenticated user when the component mounts
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error.message);
        setError("Error fetching user: " + error.message);
      } else {
        setUser(data.user);  // Set the user state to the authenticated user
      }
    };

    fetchUser();
  }, []);
 
   // Define the submitPreferences function inside the component
   const submitPreferences = async (preferences) => {
    if (!user) {
      setError("User not authenticated");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({ ...preferences, user_id: user.id });

      if (error) {
        console.error("Error submitting preferences:", error.message);  // Log the actual error
        setError("Error submitting preferences: " + error.message);    // Display error message
      } else {
        console.log("Preferences successfully submitted:", data);
        setError(null);  // Clear any previous error
      }
    } catch (err) {
      console.error("Unexpected error submitting preferences:", err);
      setError("Unexpected error: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const preferences = {
      city,
      has_HVAC: hasHVAC,
      has_ecologgica: hasEcologica,
    };

    // Call the submitPreferences function
    await submitPreferences(preferences);
  };

  return (
    <div className="container">
      <h2>Complete Your Preferences</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
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
            Are you using Ecologica adjustments?
          </label>
        </div>

        <button type="submit">Submit Preferences</button>
      </form>
    </div>
  );
};

export default Questionnaire;