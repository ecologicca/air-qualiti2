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

const Dashboard = ({ user }) => {
  const [airQualityData, setAirQualityData] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHVAC, setHasHVAC] = useState(false);
  const [hasEcologica, setHasEcologica] = useState(false);
  const [city, setCity] = useState('Toronto');
  const [firstName, setFirstName] = useState('');
  const [activeDatasets, setActiveDatasets] = useState({
    'Original PM2.5': true,
    'PM2.5 with HVAC (50% reduction)': true,
    'PM2.5 with Ecologica (30% reduction)': true,
    'PM2.5 with HVAC + Ecologica (65% total reduction)': true,
    'Original PM10': true,
    'PM10 with HVAC (50% reduction)': true,
    'PM10 with Ecologica (30% reduction)': true,
    'PM10 with HVAC + Ecologica (65% total reduction)': true
  });

  const processChartData = (data, pollutantType) => {
    console.log(`Processing ${pollutantType} data:`, {
      firstDataPoint: data[0],
      pollutantType,
      rawPM10: data[0]['PM 10'],
      rawPM25: data[0]['PM 2.5'],
      parsedPM10: parseFloat(data[0]['PM 10']),
      parsedPM25: parseFloat(data[0]['PM 2.5'])
    });

    const datasets = [
      {
        label: `Original ${pollutantType}`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM10' ? parseFloat(d['PM 10']) : parseFloat(d['PM 2.5'])
        })),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        tension: 0.1,
        hidden: !activeDatasets[`Original ${pollutantType}`]
      }
    ];

    if (hasHVAC) {
      datasets.push({
        label: `${pollutantType} with HVAC (50% reduction)`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM10' ? 
            parseFloat(d['PM 10']) * 0.5 : 
            parseFloat(d['PM 2.5']) * 0.5
        })),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        tension: 0.1,
        hidden: !activeDatasets[`${pollutantType} with HVAC (50% reduction)`]
      });
    }

    if (hasEcologica) {
      datasets.push({
        label: `${pollutantType} with Ecologica (30% reduction)`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM10' ? 
            parseFloat(d['PM 10']) * 0.7 : 
            parseFloat(d['PM 2.5']) * 0.7
        })),
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        tension: 0.1,
        hidden: !activeDatasets[`${pollutantType} with Ecologica (30% reduction)`]
      });
    }

    if (hasHVAC && hasEcologica) {
      datasets.push({
        label: `${pollutantType} with HVAC + Ecologica (65% total reduction)`,
        data: data.map(d => ({
          x: d.date,
          y: pollutantType === 'PM10' ? 
            parseFloat(d['PM 10']) * 0.5 * 0.7 : 
            parseFloat(d['PM 2.5']) * 0.5 * 0.7
        })),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 8,
        tension: 0.1,
        hidden: !activeDatasets[`${pollutantType} with HVAC + Ecologica (65% total reduction)`]
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
        !isNaN(item['PM 2.5'])
      )
      .sort((a, b) => b.date - a.date);

    console.log('Processed valid data first item:', validData[0]);

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
        console.log('Raw data from API:', {
          firstRow: data[0],
          pm25Example: data[0]['PM 2.5'],
          pm10Example: data[0]['PM 10']
        });
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
    maintainAspectRatio: true,
    aspectRatio: window.innerWidth < 768 ? 1 : 2,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: window.innerWidth < 768 ? 30 : 20
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: window.innerWidth < 768 ? 'MMM d' : 'MMM d, yyyy'
          }
        },
        title: {
          display: window.innerWidth > 768,
          text: 'Date',
          font: {
            size: 14,
            weight: 'bold'
          }
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: window.innerWidth < 768 ? 8 : 15,
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'µg/m³',
          font: {
            size: window.innerWidth < 768 ? 12 : 14,
            weight: 'bold'
          }
        },
        ticks: {
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        },
        grid: {
          drawBorder: false
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: window.innerWidth < 768 ? 'start' : 'center',
        labels: {
          padding: window.innerWidth < 768 ? 10 : 20,
          boxWidth: window.innerWidth < 768 ? 10 : 15,
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
        onClick: (event, legendItem, legend) => {
          const index = legendItem.datasetIndex;
          const ci = legend.chart;
          const meta = ci.getDatasetMeta(index);

          meta.hidden = !meta.hidden;

          setActiveDatasets(prev => ({
            ...prev,
            [legendItem.text]: !meta.hidden
          }));

          const activeCount = Object.values(activeDatasets).filter(Boolean).length;
          
          ci.data.datasets[index].borderWidth = !meta.hidden && activeCount === 1 ? 5 : 3;
          ci.data.datasets[index].pointRadius = !meta.hidden && activeCount === 1 ? 6 : 4;
          
          ci.update();
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#000',
        titleFont: {
          size: window.innerWidth < 768 ? 12 : 14,
          weight: 'bold'
        },
        bodyColor: '#000',
        bodyFont: {
          size: window.innerWidth < 768 ? 11 : 13
        },
        borderColor: '#ddd',
        borderWidth: 1,
        padding: window.innerWidth < 768 ? 8 : 12,
        displayColors: true,
        mode: 'index',
        intersect: false
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
    <div className="dashboard" style={{ width: '100%', padding: '20px' }}>
      <h1>{firstName ? `${firstName}'s ` : ''}{city} Dashboard</h1>
      
      <div style={{ 
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {/* PM2.5 Chart */}
        <div className="chart-container">
          <h2>PM2.5 Levels</h2>
          {chartData && (
            <>
              <div className="key-data-points">
                <div className="key-data-title">KEY DATA POINTS</div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 2.5', 10)}
                  </span>
                  <span className="key-data-label">
                    days over<br />10µg/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 2.5', 20)}
                  </span>
                  <span className="key-data-label">
                    days over<br />20µg/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverPeak(airQualityData, 'PM 2.5', 50)}
                  </span>
                  <span className="key-data-label">
                    days over<br />50µg/m³
                  </span>
                </div>
              </div>
              <div className="chart-wrapper">
                <Line
                  data={chartData.pm25}
                  options={chartOptions}
                />
              </div>
            </>
          )}
        </div>

        {/* PM10 Chart */}
        <div className="chart-container">
          <h2>PM10 Levels</h2>
          {chartData && (
            <>
              <div className="key-data-points">
                <div className="key-data-title">KEY DATA POINTS</div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 10', 20)}
                  </span>
                  <span className="key-data-label">
                    days over<br />20µg/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverThreshold(airQualityData, 'PM 10', 40)}
                  </span>
                  <span className="key-data-label">
                    days over<br />40µg/m³
                  </span>
                </div>
                <div className="key-data-point">
                  <span className="key-data-number">
                    {calculateDaysOverPeak(airQualityData, 'PM 10', 50)}
                  </span>
                  <span className="key-data-label">
                    days over<br />50µg/m³
                  </span>
                </div>
              </div>
              <div className="chart-wrapper">
                <Line
                  data={chartData.pm10}
                  options={chartOptions}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
