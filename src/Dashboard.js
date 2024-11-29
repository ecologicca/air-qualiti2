import React, { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import dayjs from 'dayjs';

const Dashboard = ({ user }) => {
  const [city, setCity] = useState('');
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [airQualityData, setAirQualityData] = useState([]);
  const [keyDataPoints, setKeyDataPoints] = useState({ over10: 0, over20: 0, over50: 0 });
  const [error, setError] = useState(null);
  const pm25ChartInstance = useRef(null);
  const pm10ChartInstance = useRef(null);
  const pm25Ref = useRef(null);
  const pm10Ref = useRef(null);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      console.error("User is not defined, cannot fetch preferences.");
    }
  }, [user]);

  const fetchPreferences = async () => {
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
      setCity(data.city);
      setHasHVAC(data.has_HVAC);
      setHasEcologica(data.has_ecologgica);
      fetchAirQualityData(data.city);
    }
  };

  const fetchAirQualityData = async (selectedCity) => {
    console.log("Selected City:", selectedCity);
    try {
      const response = await fetch('http://localhost:5000/api/airqualitydata');
      const data = await response.json();

      // Filter for the selected city
      const cityData = data.filter(row => row.City.toLowerCase() === selectedCity.toLowerCase());
      if (!cityData.length) {
        console.error(`No data found for city: ${selectedCity}`);
        setError(`No air quality data available for ${selectedCity}`);
        return;
      }

      // Filter data for the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const recentData = cityData.filter(row => {
        row.Date = dayjs(row.Date, 'M/D/YYYY H:mm:ss').toDate(); // Parse custom format
        return row.Date >= thirtyDaysAgo;
      });

      console.log("Filtered recentData (last 30 days):", recentData.map(row => row.Date));

      // Apply user preferences to adjust data
      const adjustedData = applyPreferences(recentData);
      setAirQualityData(adjustedData);

      // Initialize charts with adjusted data
      initChart(pm25Ref, pm25ChartInstance, 'PM 2.5', adjustedData.map(row => row.adjustedPM25));
      initChart(pm10Ref, pm10ChartInstance, 'PM 10', adjustedData.map(row => row.adjustedPM10));

      // Calculate key data points after charts are initialized
      calculateKeyDataPoints(adjustedData);
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

  const initChart = (ref, chartInstanceRef, label, data) => {
    if (chartInstanceRef.current) {
      console.log(`Destroying existing ${label} chart instance...`);
      chartInstanceRef.current.destroy();
    }

    const ctx = ref.current.getContext('2d');

    // Create the new chart
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
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: { unit: 'day' },
            title: { display: true, text: 'Date' },
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'µg/m³' },
          },
        },
      },
    });

    chartInstanceRef.current = newChart; // Save the new chart instance
  };

  return (
    <div className="dashboard">
      <h1>{city} Dashboard</h1>
      <div className="dashboard-content">
        <div className="key-data-points">
          <h3>Key Data Points</h3>
          <p><strong>{keyDataPoints.over10}</strong> days over 10 µg/m³ in the last 30 days</p>
          <p><strong>{keyDataPoints.over20}</strong> days over 20 µg/m³ in the last 30 days</p>
          <p><strong>{keyDataPoints.over50}</strong> days over 50 µg/m³ in the last 30 days</p>
        </div>
        <div className="charts-container">
          <canvas ref={pm25Ref}></canvas>
          <canvas ref={pm10Ref}></canvas>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
