import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Chart from 'chart.js/auto';
import Navbar from './Navbar';

const Dashboard = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [airQualityData, setAirQualityData] = useState([]);
  const [keyDataPoints, setKeyDataPoints] = useState({
    over10: 0,
    over20: 0,
    over50: 0,
  });

  // Track chart instances for cleanup
  const [pm25ChartInstance, setPm25ChartInstance] = useState(null);
  const [pm10ChartInstance, setPm10ChartInstance] = useState(null);

  const toggleMenu = () => setMenuOpen(!menuOpen);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // Fetch user preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error fetching user:", userError?.message || "User not found");
        return; // Exit early if there’s an issue fetching user data
      }
  
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
  
      if (data) {
        setCity(data.city);
        setHasHVAC(data.has_HVAC);
        setHasEcologica(data.has_ecologica);
      } else if (error) {
        console.error("Error fetching preferences:", error);
      }
    };
    fetchPreferences();
  }, []);

  // Fetch air quality data when city or preferences change
  useEffect(() => {
    if (!city) return;

    const fetchAirQualityData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/airqualitydata');
        const data = await response.json();
        const cityData = data.filter(row => row.City === city);

        const adjustedData = applyPreferences(cityData);
        setAirQualityData(adjustedData);

        calculateKeyDataPoints(adjustedData);
        initChart('pm25Chart', 'PM 2.5', adjustedData.map(row => row.adjustedPM25));
        initChart('pm10Chart', 'PM 10', adjustedData.map(row => row.adjustedPM10));
      } catch (error) {
        console.error('Error fetching air quality data:', error);
      }
    };

    fetchAirQualityData();

    // Cleanup charts on component unmount
 return () => {
    if (pm25ChartInstance) pm25ChartInstance.destroy();
    if (pm10ChartInstance) pm10ChartInstance.destroy();
    };
  }, [city, hasHVAC, hasEcologica]);

  // Adjust data based on user preferences
  const applyPreferences = (data) => {
    return data.map((row) => {
      const adjustedPM25 = row['PM 2.5'] * (hasHVAC ? 0.6 : 1) * (hasEcologica ? 0.75 : 1);
      const adjustedPM10 = row['PM 10'] * (hasEcologica ? 0.75 : 1);
      return { ...row, adjustedPM25, adjustedPM10 };
    });
  };

  // Calculate key data points based on adjusted PM2.5 data
  const calculateKeyDataPoints = (data) => {
    const over10 = data.filter(row => row.adjustedPM25 > 10).length;
    const over20 = data.filter(row => row.adjustedPM25 > 20).length;
    const over50 = data.filter(row => row.adjustedPM25 > 50).length;
    setKeyDataPoints({ over10, over20, over50 });
  };

  // Initialize or update charts
  const initChart = (elementId, label, data) => {
    const ctx = document.getElementById(elementId).getContext('2d');

    // Destroy previous chart instance if it exists
    if (elementId === 'pm25Chart' && pm25ChartInstance) pm25ChartInstance.destroy();
    if (elementId === 'pm10Chart' && pm10ChartInstance) pm10ChartInstance.destroy();

    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: airQualityData.map(row => row.Date),
        datasets: [{
          label: label,
          data: data,
          borderColor: 'rgba(34, 139, 34, 1)', // Green color
          backgroundColor: 'rgba(34, 139, 34, 0.2)',
          tension: 0.1,
          fill: true,
        }]
      },
      options: {
        scales: {
          x: { type: 'time', time: { unit: 'day', displayFormats: { day: 'MMM DD' }}},
          y: { beginAtZero: true }
        }
      }
    });

    // Store the new chart instance
    if (elementId === 'pm25Chart') setPm25ChartInstance(newChart);
    if (elementId === 'pm10Chart') setPm10ChartInstance(newChart);
  };

  return (
    <div className="dashboard">
      <h1>{city} Air Quality Dashboard</h1>
      <div className="dashboard-content">
        <div className="charts-container">
          <canvas id="pm25Chart"></canvas>
          <canvas id="pm10Chart"></canvas>
        </div>
        <div className="key-data-points">
          <h3>Key Data Points</h3>
          <p><strong>{keyDataPoints.over10}</strong> days over 10 µg/m³</p>
          <p><strong>{keyDataPoints.over20}</strong> days over 20 µg/m³</p>
          <p><strong>{keyDataPoints.over50}</strong> peaked at 50 µg/m³</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
