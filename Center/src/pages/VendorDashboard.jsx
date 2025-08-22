import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Truck, 
  Package,
  Phone,
  Mail,
  MapPin,
  Calendar,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import Header from '../components/common/Header';
import StatCard from '../components/common/StatCard';

const VendorDashboard = () => {
  const [disposalRequests, setDisposalRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionDialog, setActionDialog] = useState({ show: false, type: '', request: null });
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    scheduled: 0,
    completed: 0
  });
  const [actionForm, setActionForm] = useState({
    pickup_date: '',
    pickup_time: '',
    vendor_notes: '',
    status: ''
  });

  useEffect(() => {
    fetchDisposalRequests();
  }, []);

  const fetchDisposalRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/vendor/disposal-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch disposal requests');
      }

      const data = await response.json();
      
      if (data.success) {
        setDisposalRequests(data.data.requests || []);
        calculateStats(data.data.requests || []);
      } else {
        throw new Error(data.message || 'Failed to fetch disposal requests');
      }
    } catch (err) {
      console.error('Error fetching disposal requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (requests) => {
    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      scheduled: requests.filter(r => r.status === 'pickup_scheduled').length,
      completed: requests.filter(r => r.status === 'pickup_completed').length
    };
    setStats(stats);
  };

  const handleAction = async (action, requestId) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      let statusData = {
        status: action === 'accept' ? 'approved' : action === 'reject' ? 'rejected' : action,
        vendor_notes: actionForm.vendor_notes
      };

      if (action === 'schedule' && actionForm.pickup_date && actionForm.pickup_time) {
        statusData.pickup_datetime = `${actionForm.pickup_date} ${actionForm.pickup_time}`;
        statusData.status = 'pickup_scheduled';
      }

      const response = await fetch(`/api/vendor/disposal-requests/${requestId}/respond`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} request`);
      }

      const data = await response.json();
      
      if (data.success) {
        setActionDialog({ show: false, type: '', request: null });
        setActionForm({ pickup_date: '', pickup_time: '', vendor_notes: '', status: '' });
        fetchDisposalRequests(); // Refresh data
      } else {
        throw new Error(data.message || `Failed to ${action} request`);
      }
    } catch (err) {
      console.error(`Error ${action}ing request:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePickupStatus = async (requestId, newStatus) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/vendor/disposal-requests/${requestId}/respond`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          vendor_notes: `Status updated to ${getStatusLabel(newStatus)} by vendor`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      const data = await response.json();
      
      if (data.success) {
        fetchDisposalRequests(); // Refresh data
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      approved: 'bg-blue-500',
      pickup_scheduled: 'bg-purple-500',
      out_for_pickup: 'bg-orange-500',
      pickup_completed: 'bg-green-500',
      rejected: 'bg-red-500',
      cancelled: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending Review',
      approved: 'Approved',
      pickup_scheduled: 'Pickup Scheduled',
      out_for_pickup: 'Out for Pickup',
      pickup_completed: 'Pickup Completed',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className='flex-1 overflow-auto relative z-10'>
      <Header title='Vendor Dashboard - E-Waste Management' />

      <main className='max-w-7xl mx-auto py-6 px-4 lg:px-8'>
        {/* Page Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>Vendor Dashboard</h1>
          <p className='text-gray-600'>Manage disposal requests and coordinate pickup schedules</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className='mb-6 bg-red-50 border border-red-200 rounded-lg p-4'>
            <div className='flex items-center'>
              <AlertCircle className='w-5 h-5 text-red-500 mr-2' />
              <span className='text-red-700'>{error}</span>
              <button
                onClick={() => setError(null)}
                className='ml-auto text-red-500 hover:text-red-700'
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
          <StatCard
            name='Total Requests'
            icon={Package}
            value={stats.total}
            color='#3B82F6'
          />
          <StatCard
            name='Pending Review'
            icon={Clock}
            value={stats.pending}
            color='#F59E0B'
          />
          <StatCard
            name='Scheduled Pickups'
            icon={Calendar}
            value={stats.scheduled}
            color='#8B5CF6'
          />
          <StatCard
            name='Completed Pickups'
            icon={CheckCircle}
            value={stats.completed}
            color='#10B981'
          />
        </div>

        {/* Refresh Button */}
        <div className='mb-6 flex justify-between items-center'>
          <h2 className='text-xl font-semibold text-gray-900'>Disposal Requests</h2>
          <button
            onClick={fetchDisposalRequests}
            disabled={loading}
            className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50'
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Requests Table */}
        <div className='bg-white rounded-lg shadow overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Request ID
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Department
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Contact
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Items
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Created
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {loading ? (
                  <tr>
                    <td colSpan={7} className='px-6 py-8 text-center'>
                      <div className='flex items-center justify-center'>
                        <RefreshCw className='w-6 h-6 animate-spin text-blue-500 mr-2' />
                        Loading requests...
                      </div>
                    </td>
                  </tr>
                ) : disposalRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className='px-6 py-8 text-center text-gray-500'>
                      No disposal requests found
                    </td>
                  </tr>
                ) : (
                  disposalRequests.map((request) => (
                    <motion.tr
                      key={request.request_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className='hover:bg-gray-50'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                        {request.request_id}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {request.department}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        <div>
                          <div>{request.contact_name}</div>
                          <div className='text-xs text-gray-400'>{request.contact_phone}</div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {request.item_count || 'N/A'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                        {formatDate(request.created_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-center text-sm font-medium'>
                        <div className='flex items-center justify-center space-x-2'>
                          <button
                            onClick={() => setSelectedRequest(request)}
                            className='text-blue-600 hover:text-blue-900'
                            title='View Details'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setActionDialog({ show: true, type: 'accept', request })}
                                className='text-green-600 hover:text-green-900'
                                title='Accept Request'
                              >
                                <CheckCircle className='w-4 h-4' />
                              </button>
                              <button
                                onClick={() => setActionDialog({ show: true, type: 'reject', request })}
                                className='text-red-600 hover:text-red-900'
                                title='Reject Request'
                              >
                                <XCircle className='w-4 h-4' />
                              </button>
                            </>
                          )}
                          
                          {request.status === 'approved' && (
                            <button
                              onClick={() => setActionDialog({ show: true, type: 'schedule', request })}
                              className='text-purple-600 hover:text-purple-900'
                              title='Schedule Pickup'
                            >
                              <Calendar className='w-4 h-4' />
                            </button>
                          )}
                          
                          {request.status === 'pickup_scheduled' && (
                            <button
                              onClick={() => updatePickupStatus(request.request_id, 'out_for_pickup')}
                              className='text-orange-600 hover:text-orange-900'
                              title='Mark as Out for Pickup'
                              disabled={loading}
                            >
                              <Truck className='w-4 h-4' />
                            </button>
                          )}
                          
                          {request.status === 'out_for_pickup' && (
                            <button
                              onClick={() => updatePickupStatus(request.request_id, 'pickup_completed')}
                              className='text-green-600 hover:text-green-900'
                              title='Mark as Completed'
                              disabled={loading}
                            >
                              <Package className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto p-6 m-4'>
              <div className='flex justify-between items-center mb-6'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Request Details - {selectedRequest.request_id}
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className='text-gray-400 hover:text-gray-600'
                >
                  ×
                </button>
              </div>
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <h4 className='font-medium text-gray-900 mb-3'>Contact Information</h4>
                  <div className='space-y-2'>
                    <div className='flex items-center'>
                      <Mail className='w-4 h-4 text-gray-400 mr-2' />
                      <span>{selectedRequest.contact_name}</span>
                    </div>
                    <div className='flex items-center'>
                      <Phone className='w-4 h-4 text-gray-400 mr-2' />
                      <span>{selectedRequest.contact_phone}</span>
                    </div>
                    <div className='flex items-center'>
                      <Mail className='w-4 h-4 text-gray-400 mr-2' />
                      <span>{selectedRequest.contact_email}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className='font-medium text-gray-900 mb-3'>Pickup Information</h4>
                  <div className='space-y-2'>
                    <div className='flex items-start'>
                      <MapPin className='w-4 h-4 text-gray-400 mr-2 mt-1' />
                      <span>{selectedRequest.pickup_address}</span>
                    </div>
                    {selectedRequest.preferred_date && (
                      <div className='text-sm text-gray-500'>
                        Preferred: {formatDate(selectedRequest.preferred_date)}
                        {selectedRequest.preferred_time_slot && ` (${selectedRequest.preferred_time_slot})`}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className='md:col-span-2'>
                  <h4 className='font-medium text-gray-900 mb-3'>E-Waste Details</h4>
                  <p className='text-gray-700 mb-4'>{selectedRequest.e_waste_description}</p>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <span className='font-medium'>Weight:</span> {selectedRequest.weight_kg ? `${selectedRequest.weight_kg} kg` : 'N/A'}
                    </div>
                    <div>
                      <span className='font-medium'>Items:</span> {selectedRequest.item_count || 'N/A'}
                    </div>
                  </div>
                </div>
                
                {selectedRequest.additional_notes && (
                  <div className='md:col-span-2'>
                    <h4 className='font-medium text-gray-900 mb-3'>Additional Notes</h4>
                    <p className='text-gray-700'>{selectedRequest.additional_notes}</p>
                  </div>
                )}
                
                {selectedRequest.vendor_notes && (
                  <div className='md:col-span-2'>
                    <h4 className='font-medium text-gray-900 mb-3'>Vendor Notes</h4>
                    <p className='text-gray-700'>{selectedRequest.vendor_notes}</p>
                  </div>
                )}
              </div>
              
              <div className='mt-6 flex justify-end'>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className='px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Dialog */}
        {actionDialog.show && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg max-w-md w-full p-6 m-4'>
              <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                {actionDialog.type === 'accept' && 'Accept Request'}
                {actionDialog.type === 'reject' && 'Reject Request'}
                {actionDialog.type === 'schedule' && 'Schedule Pickup'}
              </h3>
              
              <div className='space-y-4'>
                {actionDialog.type === 'schedule' && (
                  <>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Pickup Date
                      </label>
                      <input
                        type='date'
                        value={actionForm.pickup_date}
                        onChange={(e) => setActionForm(prev => ({ ...prev, pickup_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-1'>
                        Pickup Time
                      </label>
                      <input
                        type='time'
                        value={actionForm.pickup_time}
                        onChange={(e) => setActionForm(prev => ({ ...prev, pickup_time: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500'
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>
                    Vendor Notes
                  </label>
                  <textarea
                    value={actionForm.vendor_notes}
                    onChange={(e) => setActionForm(prev => ({ ...prev, vendor_notes: e.target.value }))}
                    rows={3}
                    placeholder={`Add notes about ${actionDialog.type}ing this request...`}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500'
                  />
                </div>
              </div>
              
              <div className='mt-6 flex justify-end space-x-3'>
                <button
                  onClick={() => {
                    setActionDialog({ show: false, type: '', request: null });
                    setActionForm({ pickup_date: '', pickup_time: '', vendor_notes: '', status: '' });
                  }}
                  className='px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(actionDialog.type, actionDialog.request.request_id)}
                  className={`px-4 py-2 text-white rounded-lg ${
                    actionDialog.type === 'reject' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : actionDialog.type.charAt(0).toUpperCase() + actionDialog.type.slice(1)}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDashboard;