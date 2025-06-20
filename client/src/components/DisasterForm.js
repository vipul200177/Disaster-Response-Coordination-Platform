import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const DisasterForm = ({ onDisasterCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    severity: 'medium',
    tags: [],
    coordinates: null
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First, geocode the location
      const geocodeResponse = await axios.post('http://localhost:5000/api/geocoding/geocode', {
        location: formData.location
      });

      const coordinates = geocodeResponse.data.coordinates;

      // Create the disaster
      const disasterData = {
        ...formData,
        coordinates,
        status: 'active',
        tags: formData.tags.length > 0 ? formData.tags : ['general']
      };

      const response = await axios.post('http://localhost:5000/api/disasters', disasterData);
      
      toast.success('Disaster created successfully!');
      setFormData({
        title: '',
        description: '',
        location: '',
        severity: 'medium',
        tags: [],
        coordinates: null
      });
      
      if (onDisasterCreated) {
        onDisasterCreated(response.data);
      }
    } catch (error) {
      console.error('Error creating disaster:', error);
      toast.error('Failed to create disaster. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  return (
    <div className="disaster-form">
      <h2>Create New Disaster Report</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            placeholder="Brief description of the disaster"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows="4"
            placeholder="Detailed description of the disaster situation"
          />
        </div>

        <div className="form-group">
          <label htmlFor="location">Location *</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            required
            placeholder="e.g., Manhattan, New York"
          />
        </div>

        <div className="form-group">
          <label htmlFor="severity">Severity</label>
          <select
            id="severity"
            name="severity"
            value={formData.severity}
            onChange={handleInputChange}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags.join(', ')}
            onChange={handleTagsChange}
            placeholder="e.g., flood, evacuation, medical"
          />
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Creating...' : 'Create Disaster Report'}
        </button>
      </form>
    </div>
  );
};

export default DisasterForm; 