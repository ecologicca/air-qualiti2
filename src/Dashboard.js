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

ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;

const calculateHVACReduction = (value) => {
  return value * 0.7; // 30% reduction
};

const calculateEcologicaReduction = (value) => {
  return value * 0.6; // 40% reduction
};

const calculateCombinedReduction = (value) => {
  return value * 0.5; // 50% reduction
};

const calculateDeeperSleepMinutes = (data, hasHVAC, hasEcologica) => {
  const getAdjustedValue = (value) => {
    if (hasHVAC && hasEcologica) {
      return calculateCombinedReduction(value);
    } else if (hasHVAC) {
      return calculateHVACReduction(value);
    } else if (hasEcologica) {
      return calculateEcologicaReduction(value);
    }
    return value;
  };

  // Count days where PM2.5 is 5 or under after reductions
  const daysUnderThreshold = data.filter(day => {
    const adjustedValue = getAdjustedValue(parseFloat(day['PM 2.5']));
    return adjustedValue <= 5;
  }).length;

  // Calculate total minutes of deeper sleep
  // days × 8 hours × 60 minutes
  const deeperSleepMinutes = daysUnderThreshold * 8 * 60;

  return deeperSleepMinutes;
};

const Dashboard = () => {
  const [airQualityData, setAirQualityData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [city, setCity] = useState('Toronto');
  const [firstName, setFirstName] = useState('');
  const [activeDatasets, setActiveDatasets] = useState({
    'Original PM2.5': true,
    'PM2.5 with HVAC': false,
    'PM2.5 with Ecologica': false,
    'PM2.5 with Both': false,
    'Original PM10': true,
    'PM10 with HVAC': false,
    'PM10 with Ecologica': false,
    'PM10 with Both': false
  });

  const processChartData = (data, pollutantType) => {
    const datasets = [
      {
        label: `Original ${pollutantType}`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM10' ? parseFloat(d['PM 10']) : parseFloat(d['PM 2.5'])
        })),
        borderColor: 'rgb(0, 100, 0)', // Dark green
        backgroundColor: 'rgba(0, 100, 0, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        hidden: !activeDatasets[`Original ${pollutantType}`]
      }
    ];

    if (hasHVAC) {
      datasets.push({
        label: `${pollutantType} with HVAC`,
        data: data.map(d => ({
          x: d.date,
          y: calculateHVACReduction(pollutantType === 'PM10' ? parseFloat(d['PM 10']) : parseFloat(d['PM 2.5']))
        })),
        borderColor: 'rgb(34, 139, 34)', // Forest green
        backgroundColor: 'rgba(34, 139, 34, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        hidden: !activeDatasets[`${pollutantType} with HVAC`]
      });
    }

    if (hasEcologica) {
      datasets.push({
        label: `${pollutantType} with Ecologica`,
        data: data.map(d => ({
          x: d.date,
          y: calculateEcologicaReduction(pollutantType === 'PM10' ? parseFloat(d['PM 10']) : parseFloat(d['PM 2.5']))
        })),
        borderColor: 'rgb(60, 179, 113)', // Medium sea green
        backgroundColor: 'rgba(60, 179, 113, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        hidden: !activeDatasets[`${pollutantType} with Ecologica`]
      });
    }

    if (hasHVAC && hasEcologica) {
      datasets.push({
        label: `${pollutantType} with Both`,
        data: data.map(d => ({
          x: d.date,
          y: calculateCombinedReduction(pollutantType === 'PM10' ? parseFloat(d['PM 10']) : parseFloat(d['PM 2.5']))
        })),
        borderColor: 'rgb(144, 238, 144)', // Light green
        backgroundColor: 'rgba(144, 238, 144, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        hidden: !activeDatasets[`${pollutantType} with Both`]
      });
    }

    return { datasets };
  };

  useEffect(() => {
    if (airQualityData.length > 0) {
      console.log('Setting chart data with:', {
        sampleDataPoint: airQualityData[0],
        pm10Value: airQualityData[0]?.['PM 10'],
        pm25Value: airQualityData[0]?.['PM 2.5']
      });
      
      setChartData({
        pm25: processChartData(airQualityData, 'PM2.5'),
        pm10: processChartData(airQualityData, 'PM10')
      });
    }
  }, [airQualityData, hasHVAC, hasEcologica, activeDatasets]);

  const getLast30Days = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const validData = data
      .map(item => ({
        date: new Date(item.Date),
        'PM 2.5': parseFloat(item['PM 2.5']),
        'PM 10': parseFloat(item['PM 10']),
        city: item.City,
        temp: item.Temp
      }))
      .filter(item => 
        !isNaN(item.date.getTime()) && 
        !isNaN(item['PM 10']) && 
        !isNaN(item['PM 2.5']) &&
        item.city === city
      )
      .sort((a, b) => b.date - a.date);

    console.log('Processed valid data for city:', city, validData[0]);

    if (validData.length === 0) return [];

    const mostRecentDate = validData[0].date;
    const cutoffDate = new Date(mostRecentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    return validData
      .filter(item => item.date >= cutoffDate)
      .sort((a, b) => a.date - b.date);
  };

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_preferences')
          .select('has_HVAC, has_ecologgica, city')
          .eq('user_id', user.id)
          .single();

        console.log('Fetched preferences:', data);

        if (error) {
          console.error('Error fetching preferences:', error);
          return;
        }

        if (data) {
          console.log('Setting city to:', data.city);
          setCity(data.city);
          setHasHVAC(data.has_HVAC);
          setHasEcologica(data.has_ecologgica);
          
          setActiveDatasets(prev => ({
            ...prev,
            'PM2.5 with HVAC': data.has_HVAC,
            'PM2.5 with Ecologica': data.has_ecologgica,
            'PM2.5 with Both': (data.has_HVAC && data.has_ecologgica),
            'PM10 with HVAC': data.has_HVAC,
            'PM10 with Ecologica': data.has_ecologgica,
            'PM10 with Both': (data.has_HVAC && data.has_ecologgica)
          }));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchPreferences();
  }, []);

  const fetchAirQualityData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/airqualitydata?city=${city}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Raw data from API:', {
        city: city,
        firstRow: data[0],
        pm25Example: data[0]?.['PM 2.5'],
        pm10Example: data[0]?.['PM 10']
      });
      const last30DaysData = getLast30Days(data.filter(item => item.City === city));
      setAirQualityData(last30DaysData);
    } catch (error) {
      console.error('Error fetching air quality:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAirQualityData();
  }, [city]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day'
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value) {
            return value + ' ug/m³';
          }
        }
      }
    },
    plugins: {
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} ug/m³`;
          }
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          onClick: (event, legendItem, legend) => {
            const index = legendItem.datasetIndex;
            const ci = legend.chart;
            const meta = ci.getDatasetMeta(index);

            meta.hidden = !meta.hidden;

            setActiveDatasets(prev => ({
              ...prev,
              [legendItem.text]: !meta.hidden
            }));

            ci.update();
          }
        }
      }
    }
  };

  const calculateDaysOverThreshold = (data, pollutantType, threshold) => {
    return data.filter(day => 
      parseFloat(day[pollutantType]) > threshold
    ).length;
  };

  const calculateDaysOverPeak = (data, pollutantType, threshold) => {
    return data.filter(day => parseFloat(day[pollutantType]) > threshold).length;
  };

  return (
    <div className="dashboard">
      {airQualityData.length > 0 && (
        <div className="deeper-sleep-banner" style={{
          backgroundColor: '#90c789',
          color: '#1a472a',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {calculateDeeperSleepMinutes(airQualityData, hasHVAC, hasEcologica).toLocaleString()} minutes of deeper sleep
        </div>
      )}
      <h1>{firstName ? `${firstName}'s ` : ''}{city} Dashboard</h1>
      
      <div className="dashboard-container">
        {/* PM2.5 Section */}
        <div className="dashboard-section">
          <div className="content-wrapper">
            <div className="chart-side">
              <h2>PM2.5 Levels</h2>
              {chartData && chartData.pm25 && (
                <Line
                  data={chartData.pm25}
                  options={chartOptions}
                />
              )}
            </div>
            
            <div className="data-side">
              <div className="key-data-title">
                KEY DATA POINTS
              </div>
              <div className="key-data-points">
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 2.5', 10)}
                  </span>
                  <span className="key-data-label">
                    days over<br />
                    {10}ug/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 2.5', 20)}
                  </span>
                  <span className="key-data-label">
                    days over<br />
                    {20}ug/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverPeak(airQualityData, 'PM 2.5', 50)}
                  </span>
                  <span className="key-data-label">
                    days over<br />
                    {50}ug/m³
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PM10 Section */}
        <div className="dashboard-section">
          <div className="content-wrapper">
            <div className="chart-side">
              <h2>PM10 Levels</h2>
              {chartData && chartData.pm10 && (
                <Line
                  data={chartData.pm10}
                  options={chartOptions}
                />
              )}
            </div>
            
            <div className="data-side">
              <div className="key-data-title">
                KEY DATA POINTS
              </div>
              <div className="key-data-points">
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 10', 20)}
                  </span>
                  <span className="key-data-label">
                    days over<br />
                    {20}ug/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 10', 40)}
                  </span>
                  <span className="key-data-label">
                    days over<br />
                    {40}ug/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverPeak(airQualityData, 'PM 10', 50)}
                  </span>
                  <span className="key-data-label">
                    days over<br />
                    {50}ug/m³
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
