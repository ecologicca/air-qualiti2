const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Define the absolute path to your CSV file
const CSV_PATH = '/Users/caseyreid/Documents/GitHub/air-qualiti2/server/airqualitydata.csv';

// Function to verify file exists and is readable
const verifyFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV file not found at: ${filePath}`);
    }
    fs.accessSync(filePath, fs.constants.R_OK);
    const stats = fs.statSync(filePath);
    
    console.log(`CSV file verified at: ${filePath}`);
    console.log(`File size: ${stats.size} bytes`);
    console.log(`Last modified: ${stats.mtime}`);
    return true;
  } catch (error) {
    console.error('File verification failed:', error.message);
    throw error;
  }
};

// Function to read CSV file
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    try {
      verifyFile(filePath);
    } catch (error) {
      reject(error);
      return;
    }

    const results = [];
    fs.createReadStream(filePath)
      .on('error', error => {
        console.error('Error reading file:', error);
        reject(error);
      })
      .pipe(csv({
        skipLines: 0,
        // Don't specify headers here, let csv-parser detect them
        mapValues: ({ header, value }) => {
          // Convert PM values to numbers, handle empty values
          if (header === 'PM 2.5' || header === 'PM 10') {
            return value ? parseFloat(value) : 0;
          }
          return value;
        }
      }))
      .on('data', (data) => {
        // Keep the exact column names from CSV
        const cleanedData = {
          date: data.Date,
          city: data.City,
          temp: data.Temp,
          airQuality: data['Air Quality'],
          'PM 2.5': data['PM 2.5'], // Keep space in column name
          'PM 10': data['PM 10']    // Keep space in column name
        };
        console.log('Row data:', cleanedData); // Debug log
        results.push(cleanedData);
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV file contains no data'));
          return;
        }
        console.log('CSV parsing completed. First row:', results[0]);
        resolve(results);
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        reject(error);
      });
  });
}

// Endpoint for getting air quality data
app.get('/api/data', async (req, res) => {
  try {
    console.log('Attempting to read CSV from:', CSV_PATH);
    
    const data = await readCSV(CSV_PATH);
    console.log('Sending data. Total rows:', data.length);
    res.json(data);
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ 
      error: 'Failed to process CSV file',
      details: error.message,
      path: CSV_PATH
    });
  }
});

// Add error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using CSV file at: ${CSV_PATH}`);
  
  // Verify file on server start
  try {
    verifyFile(CSV_PATH);
    console.log('CSV file verified on server start');
  } catch (error) {
    console.error('WARNING: CSV file verification failed on server start:', error.message);
  }
});