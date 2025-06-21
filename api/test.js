const express = require('express');
const app = express();

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Serverless function is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('*', (req, res) => {
  res.json({ 
    message: 'Test serverless function',
    path: req.path,
    method: req.method
  });
});

module.exports = app; 