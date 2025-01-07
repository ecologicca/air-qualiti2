import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const Dashboard = ({ user }) => {
  const [airQualityData, setAirQualityData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [city, setCity] = useState('Toronto');
  const [firstName, setFirstName] = useState('');

  const processChartData = (data, pollutantType) => {
    const datasets = [
      {
        label: `Original ${pollutantType}`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM2.5' ? d.pm25 : d.pm10
        })),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ];

    if (hasHVAC) {
      datasets.push({
        label: `${pollutantType} with HVAC (50% reduction)`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM2.5' 
            ? d.pm25 * 0.5 
            : d.pm10 * 0.5
        })),
        borderColor: 'rgb(255, 159, 64)',
        tension: 0.1
      });
    }

    if (hasEcologica) {
      datasets.push({
        label: `${pollutantType} with Ecologica (30% reduction)`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM2.5' 
            ? d.pm25 * 0.7 
            : d.pm10 * 0.7
        })),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1
      });
    }

    if (hasHVAC && hasEcologica) {
      datasets.push({
        label: `${pollutantType} with HVAC + Ecologica (65% total reduction)`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM2.5' 
            ? d.pm25 * 0.5 * 0.7  // First HVAC (50%), then Ecologica (30%)
            : d.pm10 * 0.5 * 0.7
        })),
        borderColor: 'rgb(153, 102, 255)',
        tension: 0.1
      });
    }

    return { datasets };
  };

  useEffect(() => {
    if (airQualityData.length > 0) {
      setChartData({
        pm25: processChartData(airQualityData, 'PM2.5'),
        pm10: processChartData(airQualityData, 'PM10')
      });
    }
  }, [airQualityData, hasHVAC, hasEcologica]);

  const getLast30Days = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const validData = data
      .map(item => ({
        date: new Date(item.Date),
        pm25: parseFloat(item['PM 2.5']),
        pm10: parseFloat(item['PM 10']),
        city: item.City,
        temp: item.Temp
      }))
      .filter(item => !isNaN(item.date.getTime()))
      .sort((a, b) => b.date - a.date);

    if (validData.length === 0) return [];

    const mostRecentDate = validData[0].date;
    const cutoffDate = new Date(mostRecentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    return validData
      .filter(item => item.date >= cutoffDate)
      .sort((a, b) => a.date - b.date);
  };

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setHasHVAC(data.has_HVAC);
          setHasEcologica(data.has_ecologgica);
          setFirstName(data.first_name || '');
          setCity(data.city || 'Toronto');
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      }
    };

    const fetchAirQualityData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/airqualitydata');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Raw data received:', data.length, 'records');
        console.log('First record:', data[0]);
        const last30DaysData = getLast30Days(data);
        setAirQualityData(last30DaysData);
      } catch (error) {
        console.error('Error fetching air quality:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPreferences();
    }
    fetchAirQualityData();
  }, [user]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM d, yyyy'
          }
        },
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'µg/m³'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  return (
    <div className="dashboard" style={{ 
      width: '100%',
      maxWidth: '1400px',  // Maximum width for very large screens
      margin: '0 auto',    // Center the dashboard
      padding: '20px'      // Add some spacing
    }}>
      <h1>{firstName ? `${firstName}'s ` : ''}{city} Dashboard</h1>
      
      <div className="chart-container" style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'  // Add space between charts
      }}>
        <div className="chart" style={{ 
          width: '100%',
          height: 'calc(40vh - 2rem)',  // 40% of viewport height minus gap
          minHeight: '400px',           // Minimum height
          position: 'relative'          // Required for Chart.js
        }}>
          <h2>PM2.5 Levels</h2>
          {chartData && (
            <Line
              key="pm25-chart"
              data={chartData.pm25}
              options={chartOptions}
            />
          )}
        </div>
        
        <div className="chart" style={{ 
          width: '100%',
          height: 'calc(40vh - 2rem)',  // 40% of viewport height minus gap
          minHeight: '400px',           // Minimum height
          position: 'relative'          // Required for Chart.js
        }}>
          <h2>PM10 Levels</h2>
          {chartData && (
            <Line
              key="pm10-chart"
              data={chartData.pm10}
              options={chartOptions}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
