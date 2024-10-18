import React, { useEffect, useState } from 'react';
import Questionnaire from './Questionnaire';
import { supabase } from './supabaseClient';
import Chart from 'chart.js/auto';

const App = () => {
  const [user, setUser] = useState(null);  // Get the logged-in user from Supabase
  const [airQualityData, setAirQualityData] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [pm25Chart, setPm25Chart] = useState(null);
  const [pm10Chart, setPm10Chart] = useState(null);
  const [keyDataPoints, setKeyDataPoints] = useState([]);
  const [error, setError] = useState(null);  // <-- Define error state to store errors

  const cityOptions = ['Toronto', 'New York', 'San Francisco', 'Dallas', 'Boston', 'Miami', 'Houston'];  // Cities dropdown options


    // 1. Fetch the logged-in user information
    useEffect(() => {
        const fetchUser = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        };
    
        fetchUser();
      }, []);

  // Fetch user preferences to check if they've completed the questionnaire
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setHasCompletedQuestionnaire(true); // If preferences exist, they have completed the questionnaire
        setSelectedCity(data.city);         // Set default city
        applyAdjustments(data.has_HVAC, data.has_ecologgica);  // Apply PM 2.5/10 adjustments
      } else {
        setHasCompletedQuestionnaire(false); // No preferences, show questionnaire
      }
    };

    fetchUserPreferences();
  }, [user]);

  // Fetch air quality data and initialize charts
  useEffect(() => {
    const fetchAirQualityData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/airqualitydata');
        if (!response.ok) {
          throw new Error(`Error fetching air quality data: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Air Quality Data:', data); // Log the fetched data to see if it's coming through
        setAirQualityData(data);
      } catch (error) {
        console.error("Error fetching air quality data:", error);
        setError("Error fetching air quality data");
      }
    };
  
    fetchAirQualityData();
  }, [hasCompletedQuestionnaire]);

  // Initialize charts for PM 2.5 and PM 10
  const initCharts = () => {
    const ctx25 = document.getElementById('pm25Chart').getContext('2d');
    const ctx10 = document.getElementById('pm10Chart').getContext('2d');

    const newPm25Chart = new Chart(ctx25, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'PM 2.5', data: [], borderColor: 'rgb(75, 192, 192)', tension: 0.1 }] },
      options: { scales: { x: { type: 'time', title: { display: true, text: 'Date' } }, y: { beginAtZero: true, title: { display: true, text: 'µg/m³' } } } }
    });

    const newPm10Chart = new Chart(ctx10, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'PM 10', data: [], borderColor: 'rgb(255, 99, 132)', tension: 0.1 }] },
      options: { scales: { x: { type: 'time', title: { display: true, text: 'Date' } }, y: { beginAtZero: true, title: { display: true, text: 'µg/m³' } } } }
    });

    setPm25Chart(newPm25Chart);
    setPm10Chart(newPm10Chart);
  };

  // Apply PM 2.5 and PM 10 adjustments based on user preferences
  const applyAdjustments = (hasHVAC, hasEcologgica) => {
    let pm25Multiplier = 1, pm10Multiplier = 1;
    if (hasHVAC) pm25Multiplier -= 0.40;  // Reduce PM 2.5 by 40%
    if (hasEcologgica) {
      pm25Multiplier -= 0.25;  // Reduce PM 2.5 by 25%
      pm10Multiplier -= 0.25;  // Reduce PM 10 by 25%
    }
    updateChartsDataWithAdjustments(pm25Multiplier, pm10Multiplier);
  };

  // Update chart data with adjustments
  const updateChartsDataWithAdjustments = (pm25Multiplier, pm10Multiplier) => {
    const cityData = airQualityData.filter(row => row.City === selectedCity);
    const labels = cityData.map(row => row.Date);
    const pm25Data = cityData.map(row => parseFloat(row['PM 2.5']) * pm25Multiplier);
    const pm10Data = cityData.map(row => parseFloat(row['PM 10']) * pm10Multiplier);

    updateChartData(pm25Chart, labels, pm25Data);
    updateChartData(pm10Chart, labels, pm10Data);
  };

  // Helper function to update chart data
  const updateChartData = (chart, labels, data) => {
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  };

  // Handle city change from dropdown
  const handleCityChange = (event) => {
    const city = event.target.value;
    setSelectedCity(city);
    updateChartsDataWithAdjustments(1, 1);  // Reset any adjustments on city change
  };

  // Render either the questionnaire or the dashboard based on the state
  return (
    <div>
      {hasCompletedQuestionnaire ? (
        <div className="dashboard">
          <h1>Air Quality Dashboard</h1>
          <div className="upper-section">
            <div className="left-box">
              <select value={selectedCity} onChange={handleCityChange}>
                <option value="">Select a City</option>
                {[...new Set(airQualityData.map(row => row.City))].map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="right-box">
              <h2>Key Data Points</h2>
              <ul>
                <li>City: {selectedCity}</li>
                {/* Add other key data points as needed */}
              </ul>
            </div>
          </div>
          <div className="chart-section">
            <div className="chart-container">
              <h3>PM 2.5 Levels</h3>
              <canvas id="pm25Chart"></canvas>
            </div>
            <div className="chart-container">
              <h3>PM 10 Levels</h3>
              <canvas id="pm10Chart"></canvas>
            </div>
          </div>
        </div>
      ) : (
        <Questionnaire user={user} />
      )}
    </div>
  );
};

export default App;
