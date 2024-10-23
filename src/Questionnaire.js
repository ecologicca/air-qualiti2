import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Adjust this import path as needed
import { Chart } from 'chart.js/auto';  // Import Chart.js

const Dashboard = () => {
  const [city, setCity] = useState('');  // State for the selected city
  const [airQualityData, setAirQualityData] = useState([]);
  const [pm25Chart, setPm25Chart] = useState(null);
  const [pm10Chart, setPm10Chart] = useState(null);
  const [keyDataPoints, setKeyDataPoints] = useState([]);
  const [error, setError] = useState(null);

  const cityOptions = ['Toronto', 'New York', 'San Francisco', 'Dallas', 'Boston', 'Miami', 'Houston'];  // Cities dropdown options

  // Fetch user's saved city from the database
  useEffect(() => {
    const fetchUserPreferences = async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('city')
        .single();

      if (error) {
        setError("Error fetching user preferences");
      } else {
        setCity(data?.city || '');  // Set the saved city or an empty string
      }
    };

    fetchUserPreferences();
  }, []);

  // Fetch air quality data once the page loads
  useEffect(() => {
    const fetchAirQualityData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/airqualitydata');
        const data = await response.json();
        setAirQualityData(data);
      } catch (error) {
        console.error("Error fetching air quality data:", error);
        setError("Error fetching air quality data");
      }
    };

    fetchAirQualityData();
  }, []);

  // Initialize charts when air quality data is fetched and city changes
  useEffect(() => {
    if (airQualityData.length > 0 && city) {
      const cityData = airQualityData.filter(row => row.City === city);
      const labels = cityData.map(row => row.Date);
      const pm25Data = cityData.map(row => parseFloat(row['PM 2.5']));
      const pm10Data = cityData.map(row => parseFloat(row['PM 10']));

      if (!pm25Chart) {
        const ctx25 = document.getElementById('pm25Chart').getContext('2d');
        const newPm25Chart = new Chart(ctx25, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'PM 2.5',
              data: pm25Data,
              borderColor: 'rgb(75, 192, 192)',
              tension: 0.1
            }]
          },
          options: {
            scales: {
              x: {
                type: 'time',
                time: { unit: 'day', displayFormats: { day: 'MMM DD' }},
                title: { display: true, text: 'Date' }
              },
              y: { beginAtZero: true, title: { display: true, text: 'µg/m³' }}
            }
          }
        });
        setPm25Chart(newPm25Chart);
      } else {
        updateChartData(pm25Chart, labels, pm25Data);
      }

      if (!pm10Chart) {
        const ctx10 = document.getElementById('pm10Chart').getContext('2d');
        const newPm10Chart = new Chart(ctx10, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'PM 10',
              data: pm10Data,
              borderColor: 'rgb(255, 99, 132)',
              tension: 0.1
            }]
          },
          options: {
            scales: {
              x: {
                type: 'time',
                time: { unit: 'day', displayFormats: { day: 'MMM DD' }},
                title: { display: true, text: 'Date' }
              },
              y: { beginAtZero: true, title: { display: true, text: 'µg/m³' }}
            }
          }
        });
        setPm10Chart(newPm10Chart);
      } else {
        updateChartData(pm10Chart, labels, pm10Data);
      }

      calculateKeyDataPoints(city);
    }
  }, [airQualityData, city]);

  // Update chart data
  const updateChartData = (chart, labels, data) => {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update();
  };

  // Calculate key data points
  const calculateKeyDataPoints = (city) => {
    const cityData = airQualityData.filter(row => row.City === city);
    const daysOver10 = cityData.filter(row => parseFloat(row['PM 2.5']) > 10).length;
    const daysOver20 = cityData.filter(row => parseFloat(row['PM 2.5']) > 20).length;
    const daysOver50 = cityData.filter(row => parseFloat(row['PM 2.5']) > 50).length;

    setKeyDataPoints([
      `${daysOver10} days over 10 µg/m³`,
      `${daysOver20} days over 20 µg/m³`,
      `${daysOver50} days peaked at 50 µg/m³`
    ]);
  };

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  return (
    <div className="dashboard-container">
      <h2>Air Quality Dashboard</h2>

      {error && <p className="error">{error}</p>}

      <div className="form-group">
        <label>Select City:</label>
        <select value={city} onChange={handleCityChange}>
          <option value="">Select a city</option>
          {cityOptions.map(cityOption => (
            <option key={cityOption} value={cityOption}>{cityOption}</option>
          ))}
        </select>
      </div>

      <div className="charts-container">
        <canvas id="pm25Chart"></canvas>
        <canvas id="pm10Chart"></canvas>
      </div>

      <ul id="keyDataPoints">
        {keyDataPoints.map((point, index) => <li key={index}>{point}</li>)}
      </ul>
    </div>
  );
};

export default Dashboard;
