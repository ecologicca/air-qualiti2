import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Chart from 'chart.js/auto';

const Dashboard = () => {
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [airQualityData, setAirQualityData] = useState([]);
  const [keyDataPoints, setKeyDataPoints] = useState({
    over10: 0,
    over20: 0,
    over50: 0,
  });

  const [pm25ChartInstance, setPm25ChartInstance] = useState(null);
  const [pm10ChartInstance, setPm10ChartInstance] = useState(null);

  useEffect(() => {
    // Fetch preferences only if they're expected to exist
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error fetching user:", userError?.message || "User not found");
      return;
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
      fetchAirQualityData(data.city); // Fetch data only after preferences are loaded
    } else if (error) {
      console.error("Error fetching preferences:", error.message);
    }
  };
  const fetchAirQualityData = async (selectedCity) => {
    try {
      const response = await fetch('http://localhost:5000/api/airqualitydata');
      const data = await response.json();
      const cityData = data.filter(row => row.City === selectedCity);
      const adjustedData = applyPreferences(cityData);
      setAirQualityData(adjustedData);

      calculateKeyDataPoints(adjustedData);
      initChart('pm25Chart', 'PM 2.5', adjustedData.map(row => row.adjustedPM25));
      initChart('pm10Chart', 'PM 10', adjustedData.map(row => row.adjustedPM10));
    } catch (error) {
      console.error('Error fetching air quality data:', error);
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
    if (elementId === 'pm25Chart' && pm25ChartInstance) pm25ChartInstance.destroy();
    if (elementId === 'pm10Chart' && pm10ChartInstance) pm10ChartInstance.destroy();

    const newChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: airQualityData.map(row => row.Date),
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
          x: { type: 'time', time: { unit: 'day' } },
          y: { beginAtZero: true }
        }
      }
    });

    if (elementId === 'pm25Chart') setPm25ChartInstance(newChart);
    if (elementId === 'pm10Chart') setPm10ChartInstance(newChart);
  };

  return (
    <div className="dashboard">
      <Navbar />
      <h1>{city} Dashboard</h1>
      <div className="dashboard-content">
        <div className="key-data-points">
          <h3>Key Data Points</h3>
          <p><strong>{keyDataPoints.over10}</strong> days over 10 µg/m³</p>
          <p><strong>{keyDataPoints.over20}</strong> days over 20 µg/m³</p>
          <p><strong>{keyDataPoints.over50}</strong> peaked at 50 µg/m³</p>
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
