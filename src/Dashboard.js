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
import { Link } from 'react-router-dom';
import Navbar from './Navbar';  // Import your existing Navbar component

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

const calculateAnxietyRisk = (baseLevel, pm10) => {
  if (pm10 >= 10) {
    const increase = pm10 / 10;
    const riskIncrease = increase * 0.12; // 12% increase per 10mg
    return Math.min(10, baseLevel * (1 + riskIncrease));
  }
  return baseLevel;
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
  const [anxietyLevel, setAnxietyLevel] = useState(5);
  const [anxietyChartData, setAnxietyChartData] = useState(null);

  const getLast60Days = (data) => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const validData = data
      .map(item => ({
        date: new Date(item.date),
        'PM 2.5': parseFloat(item['PM 2.5']),
        'PM 10': parseFloat(item['PM 10']),
        city: item.city,
        temp: item.temp
      }))
      .filter(item => 
        !isNaN(item.date.getTime()) && 
        !isNaN(item['PM 10']) && 
        !isNaN(item['PM 2.5']) &&
        item.city === city
      )
      .sort((a, b) => b.date - a.date);

    if (validData.length === 0) return [];

    const mostRecentDate = validData[0].date;
    const cutoffDate = new Date(mostRecentDate);
    cutoffDate.setDate(cutoffDate.getDate() - 60);

    return validData
      .filter(item => item.date >= cutoffDate)
      .sort((a, b) => a.date - b.date);
  };

  const processChartData = (data, metric) => {
    const last60Days = getLast60Days(data);
    return {
      labels: last60Days.map(d => d.date),
      datasets: [{
        label: metric,
        data: last60Days.map(d => d[metric]),
        borderColor: metric === 'PM 2.5' ? '#90c789' : '#7ab073',
        backgroundColor: metric === 'PM 2.5' ? 'rgba(144, 199, 137, 0.1)' : 'rgba(122, 176, 115, 0.1)',
        borderWidth: 2,
        tension: 0.1
      }]
    };
  };

  const processAnxietyChartData = (data) => {
    return {
      labels: data.map(d => d.date || d.timestamp),
      datasets: [{
        label: 'Predicted Anxiety Level',
        data: data.map(d => ({
          x: d.date || d.timestamp,
          y: calculateAnxietyRisk(anxietyLevel, parseFloat(d['PM10']))
        })),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        tension: 0.1
      }]
    };
  };

  const fetchUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setFirstName(data.first_name || '');
        setCity(data.city || 'Toronto');
        setAnxietyLevel(data.anxiety_base_level || 5);
        setHasHVAC(data.has_HVAC);
        setHasEcologica(data.has_ecologgica);
      }
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const fetchAirQualityData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/data');
      const data = await response.json();
      
      if (data && data.length > 0) {
        setAirQualityData(data);
        
        // Process data for charts
        const processedData = {
          pm25: processChartData(data, 'PM 2.5'),
          pm10: processChartData(data, 'PM 10')
        };
        setChartData(processedData);
      }
    } catch (error) {
      console.error('Error fetching air quality data:', error);
    }
  };

  useEffect(() => {
    // Fetch both user preferences and air quality data
    const fetchData = async () => {
      await fetchUserPreferences();
      await fetchAirQualityData();
    };
    
    fetchData();
    
    // Set up interval to refresh data every 5 minutes
    const interval = setInterval(fetchData, 300000);
    
    return () => clearInterval(interval);
  }, []);

  // Add this debug section temporarily
  useEffect(() => {
    console.log('Current state:', {
      airQualityData,
      chartData,
      anxietyLevel
    });
  }, [airQualityData, chartData, anxietyLevel]);

  const calculateDaysOverThreshold = (data, pollutantType, threshold) => {
    const last60Days = getLast60Days(data);
    return last60Days.filter(day => {
      const value = pollutantType === 'PM2.5' ? day['PM 2.5'] : day['PM 10'];
      return parseFloat(value) > threshold;
    }).length;
  };

  const calculateDaysOverPeak = (data, pollutantType, threshold) => {
    return data.filter(day => {
      // Match the exact column names from your CSV
      const value = pollutantType === 'PM2.5' ? day['PM 2.5'] : day['PM 10'];
      return parseFloat(value) > threshold;
    }).length;
  };

  // Add this debug log to check the data structure
  useEffect(() => {
    if (airQualityData.length > 0) {
      console.log('Sample data row:', airQualityData[0]);
      console.log('PM2.5 value:', airQualityData[0]['PM 2.5']);
      console.log('PM10 value:', airQualityData[0]['PM 10']);
    }
  }, [airQualityData]);

  return (
    <>
      <Navbar />  {/* Use your existing Navbar component */}

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
                <div style={{ height: '400px', width: '100%' }}>
                  {chartData && chartData.pm25 && (
                    <Line
                      data={chartData.pm25}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            type: 'time',
                            time: {
                              unit: 'day',
                              displayFormats: {
                                day: 'MMM d'
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
                              text: 'μg/m³'
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'bottom'
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
              
              <div className="data-side">
                <div className="key-data-title">
                  KEY DATA POINTS
                </div>
                <div className="key-data-points">
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {calculateDaysOverThreshold(airQualityData, 'PM2.5', 10)}
                    </span>
                    <span className="key-data-label">
                      days over<br />
                      {10}ug/m³
                    </span>
                  </div>
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {calculateDaysOverThreshold(airQualityData, 'PM2.5', 20)}
                    </span>
                    <span className="key-data-label">
                      days over<br />
                      {20}ug/m³
                    </span>
                  </div>
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {calculateDaysOverPeak(airQualityData, 'PM2.5', 50)}
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
                <div style={{ height: '400px', width: '100%' }}>
                  {chartData && chartData.pm10 && (
                    <Line
                      data={chartData.pm10}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            type: 'time',
                            time: {
                              unit: 'day',
                              displayFormats: {
                                day: 'MMM d'
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
                              text: 'μg/m³'
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'bottom'
                          },
                          tooltip: {
                            mode: 'index',
                            intersect: false
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
              
              <div className="data-side">
                <div className="key-data-title">
                  KEY DATA POINTS
                </div>
                <div className="key-data-points">
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {calculateDaysOverThreshold(airQualityData, 'PM10', 20)}
                    </span>
                    <span className="key-data-label">
                      days over<br />
                      {20}ug/m³
                    </span>
                  </div>
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {calculateDaysOverThreshold(airQualityData, 'PM10', 40)}
                    </span>
                    <span className="key-data-label">
                      days over<br />
                      {40}ug/m³
                    </span>
                  </div>
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {calculateDaysOverPeak(airQualityData, 'PM10', 50)}
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

          {/* Anxiety Section */}
          <div className="dashboard-section">
            <div className="content-wrapper">
              <div className="chart-side">
                <h2>Anxiety Tracking</h2>
                <div style={{ height: '400px', width: '100%' }}>
                  {chartData && (
                    <Line
                      data={{
                        labels: getLast60Days(airQualityData).map(d => d.date),
                        datasets: [{
                          label: 'Predicted Anxiety Level',
                          data: getLast60Days(airQualityData).map(d => ({
                            x: d.date,
                            y: calculateAnxietyRisk(anxietyLevel, parseFloat(d['PM 10']))
                          })),
                          borderColor: 'rgb(255, 99, 132)',
                          backgroundColor: 'rgba(255, 99, 132, 0.1)',
                          borderWidth: 2,
                          tension: 0.1
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            type: 'time',
                            time: {
                              unit: 'day',
                              displayFormats: {
                                day: 'MMM d'
                              }
                            },
                            title: {
                              display: true,
                              text: 'Date'
                            }
                          },
                          y: {
                            beginAtZero: true,
                            max: 10,
                            title: {
                              display: true,
                              text: 'Anxiety Level'
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
              
              <div className="data-side">
                <div className="key-data-title">
                  KEY DATA POINTS
                </div>
                <div className="key-data-points">
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {anxietyLevel.toFixed(1)}
                    </span>
                    <span className="key-data-label">
                      Base<br />Level
                    </span>
                  </div>
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {getLast60Days(airQualityData).filter(day => 
                        calculateAnxietyRisk(anxietyLevel, parseFloat(day['PM 10'])) > anxietyLevel
                      ).length}
                    </span>
                    <span className="key-data-label">
                      Days with<br />Increased Risk
                    </span>
                  </div>
                  <div className="key-data-point">
                    <span className="key-data-number">
                      {Math.max(...getLast60Days(airQualityData).map(day => 
                        calculateAnxietyRisk(anxietyLevel, parseFloat(day['PM 10']))
                      )).toFixed(1)}
                    </span>
                    <span className="key-data-label">
                      Peak<br />Level
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;