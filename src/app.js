import React, { useEffect, useState } from 'react';
import Questionnaire from './Questionnaire';
import { supabase } from './supabaseClient';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import './styles.css'; // Styling

const App = () => {
  const [user, setUser] = useState(null);  // Get the logged-in user from Supabase
  const [airQualityData, setAirQualityData] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [hasCompletedQuestionnaire, setHasCompletedQuestionnaire] = useState(false);
  const [pm25Chart, setPm25Chart] = useState(null);
  const [pm10Chart, setPm10Chart] = useState(null);
  const [error, setError] = useState(null);  // Define error state to store errors
  const [loading, setLoading] = useState(true);

  // Fetch the logged-in user information
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setLoading(false); // Set loading to false once user is fetched
      } catch (error) {
        setError('Error fetching user');
        setLoading(false);  // Set loading to false on error
      }
    };
    fetchUser();
  }, []);

  // Helper function to update chart data
  const updateChartData = (chart, labels, data) => {
    if (!chart) return;
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  };

  // Update chart data with adjustments
  const updateChartsDataWithAdjustments = (pm25Multiplier, pm10Multiplier) => {
    const cityData = airQualityData.filter(row => row.City === selectedCity);
    const labels = cityData.map(row => row.Date);
    const pm25Data = cityData.map(row => parseFloat(row['PM 2.5']) * pm25Multiplier);
    const pm10Data = cityData.map(row => parseFloat(row['PM 10']) * pm10Multiplier);

    if (pm25Chart) {
      updateChartData(pm25Chart, labels, pm25Data);
    }

    if (pm10Chart) {
      updateChartData(pm10Chart, labels, pm10Data);
    }
  };

  // Apply adjustments based on user preferences
  const applyAdjustments = (hasHVAC, hasEcologgica) => {
    let pm25Multiplier = 1, pm10Multiplier = 1;

    if (hasHVAC) pm25Multiplier -= 0.40;
    if (hasEcologgica) {
      pm25Multiplier -= 0.25;
      pm10Multiplier -= 0.25;
    }

    updateChartsDataWithAdjustments(pm25Multiplier, pm10Multiplier);
  };

  // Fetch user preferences to check if they've completed the questionnaire
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setHasCompletedQuestionnaire(true);
          setSelectedCity(data.city);
          applyAdjustments(data.has_HVAC, data.has_ecologgica);
        } else {
          setHasCompletedQuestionnaire(false);
        }
      } catch (error) {
        setError('Error fetching preferences');
      } finally {
        setLoading(false); 
      }
    };
    fetchUserPreferences();
  }, [user]);

  // Fetch air quality data and initialize charts
  useEffect(() => {
    if (!hasCompletedQuestionnaire) return;

    const fetchAirQualityData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/airqualitydata');
        if (!response.ok) {
          throw new Error(`Error fetching air quality data: ${response.statusText}`);
        }
        const data = await response.json();
        setAirQualityData(data);
        initCharts(data);
      } catch (error) {
        setError("Error fetching air quality data");
      }
    };
    fetchAirQualityData();
  }, [hasCompletedQuestionnaire]);

  // Initialize charts for PM 2.5 and PM 10
  const initCharts = (data) => {
    const ctx25 = document.getElementById('pm25Chart').getContext('2d');
    const ctx10 = document.getElementById('pm10Chart').getContext('2d');

    const cityData = data.filter(row => row.City === selectedCity);
    const labels = cityData.map(row => row.Date);
    const pm25Data = cityData.map(row => row['PM 2.5']);
    const pm10Data = cityData.map(row => row['PM 10']);

    const newPm25Chart = new Chart(ctx25, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ 
          label: 'PM 2.5', 
          data: pm25Data, 
          borderColor: 'rgb(75, 192, 192)', 
          tension: 0.1 
        }],
      },
      options: {
        scales: {
          x: { 
            type: 'time', 
            time: {
              unit: 'day'
            },
            title: { display: true, text: 'Date' }
          },
          y: { beginAtZero: true, title: { display: true, text: 'µg/m³' } }
        }
      }
    });
    
    const newPm10Chart = new Chart(ctx10, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{ 
          label: 'PM 10', 
          data: pm10Data, 
          borderColor: 'rgb(255, 99, 132)', 
          tension: 0.1 
        }],
      },
      options: {
        scales: {
          x: { 
            type: 'time',
            time: {
              unit: 'day'
            },
            title: { display: true, text: 'Date' }
          },
          y: { beginAtZero: true, title: { display: true, text: 'µg/m³' } }
        }
      }
    });
    
    setPm25Chart(newPm25Chart);
    setPm10Chart(newPm10Chart);
  };

  // Handle city change from dropdown
  const handleCityChange = (event) => {
    const city = event.target.value;
    setSelectedCity(city);
    updateChartsDataWithAdjustments(1, 1); 
  };

  // Return statement should be inside the App function
  return (
    <div className="dashboard-container">
      {error && <p className="error-message">{error}</p>}
      {hasCompletedQuestionnaire ? (
        <div className="dashboard">
          <h1>Air Quality Dashboard</h1>
          <div className="upper-section">
            <div className="left-box">
              <label htmlFor="city-select">Select City</label>
              <select id="city-select" value={selectedCity} onChange={handleCityChange}>
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
