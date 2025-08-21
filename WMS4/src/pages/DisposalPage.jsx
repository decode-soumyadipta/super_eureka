import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  Tab, 
  Tabs, 
  Paper, 
  Container,
  Alert,
  Divider
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { disposalService } from '../services/disposalService';
import DisposalRequestForm from '../components/disposal/DisposalRequestForm';
import DisposalRequestsTable from '../components/disposal/DisposalRequestsTable';
import DisposalRequestDetails from '../components/disposal/DisposalRequestDetails';
import Header from '../components/common/Header';

function DisposalPage() {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Load disposal requests on initial render
  useEffect(() => {
    if (tabValue === 1) {
      fetchRequests();
    }
  }, [tabValue]);

  // Function to fetch disposal requests
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await disposalService.getRequests();
      if (response.success) {
        setRequests(response.data);
      } else {
        setError(response.message || 'Failed to fetch disposal requests');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching disposal requests');
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSelectedRequest(null);
    setShowForm(false);
  };

  // Handle form submission
  const handleFormSubmit = async (formData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await disposalService.createRequest(formData);
      if (response.success) {
        setSuccess('E-waste disposal request created successfully!');
        setShowForm(false);
        fetchRequests(); // Refresh the requests list
        setTabValue(1); // Switch to My Requests tab
      } else {
        setError(response.message || 'Failed to create disposal request');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while creating the disposal request');
    } finally {
      setLoading(false);
    }
  };

  // Handle view request details
  const handleViewRequest = async (requestId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await disposalService.getRequestById(requestId);
      if (response.success) {
        setSelectedRequest(response.data);
      } else {
        setError(response.message || 'Failed to fetch request details');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching request details');
    } finally {
      setLoading(false);
    }
  };

  // Handle request status update
  const handleUpdateStatus = async (requestId, statusData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await disposalService.updateRequestStatus(requestId, statusData);
      if (response.success) {
        setSuccess(`Request status updated to ${statusData.status} successfully!`);
        // Refresh data
        fetchRequests();
        if (selectedRequest && selectedRequest.request_id === requestId) {
          handleViewRequest(requestId);
        }
      } else {
        setError(response.message || 'Failed to update request status');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating request status');
    } finally {
      setLoading(false);
    }
  };

  // Clear any success/error messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className='flex-1 overflow-auto relative z-10' style={{ backgroundColor: '#f5f5f5' }}>
      <Header title='E-Waste Disposal Management' />
      
      <main className='max-w-7xl mx-auto py-6 px-4 lg:px-8' style={{ minHeight: 'calc(100vh - 80px)', backgroundColor: 'transparent' }}>
        <Container 
          maxWidth="lg" 
          sx={{ 
            backgroundColor: 'transparent',
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none'
          }}
        >
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              E-Waste Disposal Management
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Request pickup for electronic waste from your department and track disposal status.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Paper 
            sx={{ 
              width: '100%', 
              mb: 2, 
              overflow: 'hidden',
              backgroundColor: '#ffffff',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="e-waste disposal tabs"
                indicatorColor="primary"
                textColor="primary"
              >
                <Tab label="Request Disposal" />
                <Tab label="My Requests" />
              </Tabs>
            </Box>

            {/* Request Disposal Tab */}
            {tabValue === 0 && (
              <Box sx={{ p: 3 }}>
                {!showForm ? (
                  <Box sx={{ textAlign: 'center', py: 5 }}>
                    <DeleteIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Ready to dispose of electronic waste?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                      Fill out a request form to schedule a pickup of your e-waste materials.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        clearMessages();
                        setShowForm(true);
                      }}
                    >
                      Create Disposal Request
                    </Button>
                  </Box>
                ) : (
                  <DisposalRequestForm 
                    onSubmit={handleFormSubmit} 
                    onCancel={() => setShowForm(false)}
                    loading={loading}
                  />
                )}
              </Box>
            )}

            {/* My Requests Tab */}
            {tabValue === 1 && (
              <Box sx={{ p: 3 }}>
                {selectedRequest ? (
                  <Box>
                    <Button
                      onClick={() => setSelectedRequest(null)}
                      sx={{ mb: 2 }}
                    >
                      Back to All Requests
                    </Button>
                    <DisposalRequestDetails 
                      request={selectedRequest} 
                      onUpdateStatus={handleUpdateStatus}
                      loading={loading}
                    />
                  </Box>
                ) : (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="h6">My Disposal Requests</Typography>
                      <Button
                        startIcon={<RefreshIcon />}
                        onClick={fetchRequests}
                        disabled={loading}
                      >
                        Refresh
                      </Button>
                    </Box>
                    <DisposalRequestsTable 
                      requests={requests} 
                      loading={loading}
                      onViewRequest={handleViewRequest}
                    />
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Container>
      </main>
    </div>
  );
}

export default DisposalPage;