import React, { useState } from 'react';
import { Shield, Users } from 'lucide-react';

const Login = ({ onLogin, users }) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    const success = onLogin(selectedUser);
    if (!success) {
      setError('Invalid user selected');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Shield className="login-icon" />
          <h1>Disaster Response Platform</h1>
          <p>Select a user to continue</p>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label className="form-label">
              <Users className="form-icon" />
              Select User
            </label>
            <select
              className="form-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Choose a user...</option>
              {users.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={!selectedUser}
          >
            Login
          </button>
        </div>

        <div className="login-info">
          <h3>Available Users:</h3>
          <ul>
            <li><strong>netrunnerX</strong> - Admin (Full access)</li>
            <li><strong>reliefAdmin</strong> - Admin (Full access)</li>
            <li><strong>fieldWorker</strong> - Contributor (Read, Write)</li>
            <li><strong>volunteer</strong> - Volunteer (Read only)</li>
            <li><strong>citizen1</strong> - Citizen (Read only)</li>
          </ul>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 1rem;
        }

        .login-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          width: 100%;
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-icon {
          width: 64px;
          height: 64px;
          color: #667eea;
          margin: 0 auto 1rem;
        }

        .login-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 0.5rem;
        }

        .login-header p {
          color: #64748b;
          font-size: 1rem;
        }

        .login-form {
          margin-bottom: 2rem;
        }

        .form-icon {
          width: 16px;
          height: 16px;
          margin-right: 0.5rem;
        }

        .login-info {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1rem;
          border-left: 4px solid #667eea;
        }

        .login-info h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.75rem;
        }

        .login-info ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .login-info li {
          padding: 0.25rem 0;
          color: #64748b;
          font-size: 0.875rem;
        }

        .login-info strong {
          color: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default Login; 