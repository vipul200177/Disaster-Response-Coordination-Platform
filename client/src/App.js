import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import axios from 'axios';

// Components
import Login from './components/Login';

// Context
import { AuthContext } from './context/AuthContext';
import { SocketContext } from './context/SocketContext';

// Styles
import './App.css';

// Mock users for authentication
const MOCK_USERS = {
  'netrunnerX': { username: 'netrunnerX', role: 'admin' },
  'reliefAdmin': { username: 'reliefAdmin', role: 'admin' },
  'fieldWorker': { username: 'fieldWorker', role: 'contributor' },
  'volunteer': { username: 'volunteer', role: 'volunteer' },
  'citizen1': { username: 'citizen1', role: 'citizen' }
};

function App() {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disasters, setDisasters] = useState([]);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('disaster_created', (data) => {
      console.log('New disaster created:', data);
      // You can add toast notifications here
    });

    newSocket.on('disaster_updated', (data) => {
      console.log('Disaster updated:', data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Check for stored user on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('disasterResponseUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
    }
    setLoading(false);
  }, []);

  // Fetch disasters when user is logged in
  useEffect(() => {
    if (user) {
      fetchDisasters();
    }
  }, [user]);

  // Login function
  const login = (username) => {
    if (MOCK_USERS[username]) {
      const userData = MOCK_USERS[username];
      setUser(userData);
      localStorage.setItem('disasterResponseUser', JSON.stringify(userData));
      
      // Set default authorization header for all requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${username}`;
      
      return true;
    }
    return false;
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('disasterResponseUser');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Fetch disasters from API
  const fetchDisasters = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/disasters');
      setDisasters(response.data || []);
    } catch (error) {
      console.error('Error fetching disasters:', error);
      setDisasters([]);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading Disaster Response Platform...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <Login onLogin={login} users={Object.keys(MOCK_USERS)} />
        <Toaster position="top-right" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <SocketContext.Provider value={socket}>
        <div className="app">
          <header className="header">
            <h1>🚨 Disaster Response Platform</h1>
            <div className="user-info">
              <span>Welcome, {user.username} ({user.role})</span>
              <button onClick={logout} className="logout-btn">Logout</button>
            </div>
          </header>
          
          <main className="main-content">
            <div className="dashboard">
              <h2>Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Active Disasters</h3>
                  <p className="stat-number">{disasters.length}</p>
                </div>
                <div className="stat-card">
                  <h3>Your Role</h3>
                  <p className="stat-text">{user.role}</p>
                </div>
                <div className="stat-card">
                  <h3>Connection Status</h3>
                  <p className="stat-text">{socket ? '🟢 Connected' : '🔴 Disconnected'}</p>
                </div>
              </div>
              
              <div className="disasters-section">
                <h3>Recent Disasters</h3>
                {disasters.length > 0 ? (
                  <div className="disasters-list">
                    {disasters.map((disaster, index) => (
                      <div key={index} className="disaster-card">
                        <h4>{disaster.title || 'Untitled Disaster'}</h4>
                        <p>{disaster.description || 'No description available'}</p>
                        <div className="disaster-meta">
                          <span>Status: {disaster.status || 'Unknown'}</span>
                          <span>Created: {new Date(disaster.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No disasters found. The backend is running in mock mode.</p>
                )}
              </div>
              
              <div className="api-test-section">
                <h3>API Test</h3>
                <button onClick={fetchDisasters} className="test-btn">
                  Refresh Disasters
                </button>
                <p>Backend URL: http://localhost:5000</p>
                <p>Frontend URL: http://localhost:3000</p>
              </div>
            </div>
          </main>
          
          <Toaster position="top-right" />
        </div>
      </SocketContext.Provider>
    </AuthContext.Provider>
  );
}

export default App; 