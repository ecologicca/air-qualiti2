document.addEventListener('DOMContentLoaded', function() {
  const citySelect = document.getElementById('city');
  const pm25ChartCanvas = document.getElementById('pm25Chart');
  const pm10ChartCanvas = document.getElementById('pm10Chart');
  const sleepQuality = document.getElementById('sleepQuality');
  const respiratoryIllness = document.getElementById('respiratoryIllness');
  const nervousSystem = document.getElementById('nervousSystem');
  const keyDataPoints = document.getElementById('keyDataPoints');
  
  let airQualityData = [];
  let pm25Chart, pm10Chart;

  // Function to fetch data from your local server
  function fetchAirQualityData() {
      fetch('http://localhost:3000/api/airqualitydata')
          .then(response => response.json())
          .then(data => {
              airQualityData = data;
              populateCityDropdown(data);
              initCharts();  // Initialize charts once data is fetched
          })
          .catch(error => console.error('Error fetching data:', error));
  }

  // Populate city dropdown
  function populateCityDropdown(data) {
      citySelect.innerHTML = '<option value="">Select a City</option>';
      const cities = [...new Set(data.map(row => row.City))];
      cities.forEach(city => {
          const option = document.createElement('option');
          option.value = city;
          option.textContent = city;
          citySelect.appendChild(option);
      });
  }

  // Calculate key data points
  function calculateKeyDataPoints(city) {
      const cityData = airQualityData.filter(row => row.City === city);
      const daysOver10 = cityData.filter(row => parseFloat(row['PM 2.5']) > 10).length;
      const daysOver20 = cityData.filter(row => parseFloat(row['PM 2.5']) > 20).length;
      const daysOver50 = cityData.filter(row => parseFloat(row['PM 2.5']) > 50).length;

      keyDataPoints.innerHTML = `
          <li>${daysOver10} days over 10 µg/m³</li>
          <li>${daysOver20} days over 20 µg/m³</li>
          <li>${daysOver50} days peaked at 50 µg/m³</li>
      `;
  }

  // Initialize charts for PM 2.5 and PM 10
  function initCharts() {
      const ctx25 = pm25ChartCanvas.getContext('2d');
      const ctx10 = pm10ChartCanvas.getContext('2d');
      
      pm25Chart = new Chart(ctx25, {
          type: 'line',
          data: {
              labels: [],
              datasets: [{
                  label: 'PM 2.5',
                  data: [],
                  borderColor: 'rgb(75, 192, 192)',
                  tension: 0.1
              }]
          },
          options: {
              scales: {
                  x: {
                      type: 'time',
                      time: {
                          unit: 'day',
                          displayFormats: {
                              day: 'MMM DD'
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
              }
          }
      });
      
      pm10Chart = new Chart(ctx10, {
          type: 'line',
          data: {
              labels: [],
              datasets: [{
                  label: 'PM 10',
                  data: [],
                  borderColor: 'rgb(255, 99, 132)',
                  tension: 0.1
              }]
          },
          options: {
              scales: {
                  x: {
                      type: 'time',
                      time: {
                          unit: 'day',
                          displayFormats: {
                              day: 'MMM DD'
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
              }
          }
      });
  }

  // Update charts based on selected city
  citySelect.addEventListener('change', function() {
      const city = this.value;
      if (city) {
          calculateKeyDataPoints(city);
          updateCharts(city);
      } else {
          keyDataPoints.innerHTML = '';  // Clear key data points if no city selected
      }
  });

  // Add event listeners for health concern checkboxes
  sleepQuality.addEventListener('change', updateBaselines);
  respiratoryIllness.addEventListener('change', updateBaselines);
  nervousSystem.addEventListener('change', updateBaselines);

  // Recalculate baselines based on selected checkboxes
  function updateBaselines() {
      const baselinesPM25 = [];
      const baselinesPM10 = [];

      if (sleepQuality.checked) {
          baselinesPM25.push({ y: 10, borderColor: 'green', borderDash: [5, 5] });
          baselinesPM10.push({ y: 10, borderColor: 'green', borderDash: [5, 5] });
      }
      if (nervousSystem.checked) {
          baselinesPM25.push({ y: 13, borderColor: 'blue', borderDash: [5, 5] });
          baselinesPM10.push({ y: 13, borderColor: 'blue', borderDash: [5, 5] });
      }
      if (respiratoryIllness.checked) {
          baselinesPM25.push({ y: 20, borderColor: 'red', borderDash: [5, 5] });
          baselinesPM10.push({ y: 20, borderColor: 'red', borderDash: [5, 5] });
      }

      updateChartWithBaselines(pm25Chart, baselinesPM25);
      updateChartWithBaselines(pm10Chart, baselinesPM10);
  }

  // Function to add baselines to a chart
  function updateChartWithBaselines(chart, baselines) {
      chart.options.plugins.annotation = {
          annotations: baselines.map(baseline => ({
              type: 'line',
              yMin: baseline.y,
              yMax: baseline.y,
              borderColor: baseline.borderColor,
              borderWidth: 2,
              borderDash: baseline.borderDash
          }))
      };
      chart.update();
  }

  // Update the charts with new data
  function updateCharts(city) {
      if (!city) return;

      const cityData = airQualityData.filter(row => row.City === city);
      const labels = cityData.map(row => row.Date);
      const pm25Data = cityData.map(row => parseFloat(row['PM 2.5']));
      const pm10Data = cityData.map(row => parseFloat(row['PM 10']));

      updateChartData(pm25Chart, labels, pm25Data);
      updateChartData(pm10Chart, labels, pm10Data);
  }

  // Update chart data
  function updateChartData(chart, labels, data) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.update();
  }

  // Fetch the air quality data on page load
  fetchAirQualityData();
});