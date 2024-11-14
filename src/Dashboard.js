import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';

const Dashboard = ({ user }) => {
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [airQualityData, setAirQualityData] = useState([]);
  const [keyDataPoints, setKeyDataPoints] = useState({ over10: 0, over20: 0, over50: 0 });
  const [pm25ChartInstance, setPm25ChartInstance] = useState(null);
  const [pm10ChartInstance, setPm10ChartInstance] = useState(null);
  const [error, setError] = useState(null);

  // Fetch preferences only when `user` is available
  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      console.error("User is not defined, cannot fetch preferences.");
    }
  }, [user]); // Only re-run if `user` changes

  const fetchPreferences = async () => {
    // Check if `user` is defined
    if (!user || !user.id) {
      console.error("User ID is undefined, cannot fetch preferences.");
      setError("User not authenticated.");
      return;
    }

    console.log("Fetching preferences for User ID:", user.id);

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error("Error fetching preferences:", error.message);
      setError("Error fetching preferences: " + error.message);
      return;
    }

    if (data) {
      console.log("Fetched user preferences:", data);
      setCity(data.city);  // Set city state
      setHasHVAC(data.has_HVAC);  // Set hasHVAC state
      setHasEcologica(data.has_ecologgica);  // Set hasEcologica state
      fetchAirQualityData(data.city); // Fetch data only after preferences are loaded
    }
  };

  const fetchAirQualityData = async (selectedCity) => {
    try {
      const response = await fetch('http://localhost:5000/api/airqualitydata');
      const data = await response.json();
      const cityData = data.filter(row => row.City.toLowerCase() === selectedCity.toLowerCase());
  
      // Get today's date and calculate the date 30 days ago
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
  
      // Filter for data from the last 30 days
      const recentData = cityData.filter(row => new Date(row.Date) >= thirtyDaysAgo);
  
      const adjustedData = applyPreferences(recentData);
      setAirQualityData(adjustedData);
  
      calculateKeyDataPoints(adjustedData);
      initChart('pm25Chart', 'PM 2.5', adjustedData.map(row => row.adjustedPM25));
      initChart('pm10Chart', 'PM 10', adjustedData.map(row => row.adjustedPM10));
    } catch (error) {
      console.error('Error fetching air quality data:', error);
      setError("Error fetching air quality data.");
    }
  };

  const applyPreferences = (data) => {
    return data.map((row) => {
      const adjustedPM25 = row['PM 2.5'] * (hasHVAC ? 0.6 : 1) * (hasEcologica ? 0.75 : 1);
      const adjustedPM10 = row['PM 10'] * (hasEcologica ? 0.75 : 1);
      return { ...row, adjustedPM25, adjustedPM10 };
    });
  };

  const calculateKeyDataPoints = (data) => {
    const over10 = data.filter(row => row.adjustedPM25 > 10).length;
    const over20 = data.filter(row => row.adjustedPM25 > 20).length;
    const over50 = data.filter(row => row.adjustedPM25 > 50).length;
    setKeyDataPoints({ over10, over20, over50 });
  };

  const initChart = (elementId, label, data) => {
    const ctx = document.getElementById(elementId).getContext('2d');
  
    // Destroy any existing instance of the chart
    if (elementId === 'pm25Chart' && pm25ChartInstance) pm25ChartInstance.destroy();
    if (elementId === 'pm10Chart' && pm10ChartInstance) pm10ChartInstance.destroy();
  
    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: airQualityData.map(row => row.Date), // Make sure this contains 30 days of dates
        datasets: [{
          label: label,
          data: data,
          borderColor: 'rgba(34, 139, 34, 1)',
          backgroundColor: 'rgba(34, 139, 34, 0.2)',
          tension: 0.1,
          fill: true,
        }]
      },
      options: {
        scales: {
          x: { 
            type: 'time', 
            time: { unit: 'day' }, // Ensure the x-axis shows daily intervals
          },
          y: { beginAtZero: true }
        }
      }
    });
  
    // Set the correct chart instance
    if (elementId === 'pm25Chart') setPm25ChartInstance(newChart);
    if (elementId === 'pm10Chart') setPm10ChartInstance(newChart);
  };  

  return (
    <div className="dashboard">
      <h1>{city} Dashboard</h1> {/* Use the city state */}
      <div className="dashboard-content">
        <div className="key-data-points">
          <h3>Key Data Points</h3>
          <p><strong>{keyDataPoints.over10}</strong> days over 10 µg/m³ in the last 30 days</p>
          <p><strong>{keyDataPoints.over20}</strong> days over 20 µg/m³ in the last 30 days</p>
          <p><strong>{keyDataPoints.over50}</strong> days over 50 µg/m³ in the last 30 days</p>
        </div>
        <div className="charts-container">
          <canvas id="pm25Chart"></canvas>
          <canvas id="pm10Chart"></canvas>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
