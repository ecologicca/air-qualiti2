import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Change this to import App instead of MainRouter
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App /> {/* Render App instead of MainRouter */}
  </React.StrictMode>
);
