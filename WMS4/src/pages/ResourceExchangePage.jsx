import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Search, 
    Filter, 
    Clock, 
    User, 
    Building, 
    AlertCircle,
    CheckCircle,
    XCircle,
    MessageSquare,
    ArrowRight,
    Calendar,
    Cpu,
    Monitor,
    Eye,
    Mail,
    Phone,
    MapPin,
    Star,
    ThumbsUp,
    ThumbsDown,
    ExternalLink,
    Briefcase
} from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/common/Header';
import { resourceExchangeService } from '../services/resourceExchangeService';
import { authService } from '../services/authService';

const ResourceExchangePage = () => {
    const [requests, setRequests] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'my-requests', 'create'
    const [user, setUser] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        department: '',
        urgency: ''
    });

    // View request details modal
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [loadingRequestDetails, setLoadingRequestDetails] = useState(false);

    // Create request form state
    const [createForm, setCreateForm] = useState({
        device_type: '',
        description: '',
        urgency: 'medium',
        preferred_exchange_date: '',
        specifications: {
            brand: '',
            model: '',
            condition: '',
            additional_specs: ''
        }
    });

    // Response form state
    const [responseForm, setResponseForm] = useState({
        selectedRequestId: null,
        offer_description: '',
        terms: '',
        showResponseModal: false
    });

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        fetchData();
    }, [filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Fetch all requests and user's own requests in parallel
            const [allRequestsResponse, myRequestsResponse] = await Promise.all([
                resourceExchangeService.getRequests(filters),
                resourceExchangeService.getMyRequests()
            ]);

            setRequests(allRequestsResponse.data || []);
            setMyRequests(myRequestsResponse.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load resource exchange data');
        } finally {
            setLoading(false);
        }
    };

    const fetchRequestDetails = async (requestId) => {
        try {
            setLoadingRequestDetails(true);
            const response = await resourceExchangeService.getRequestById(requestId);
            setSelectedRequest(response.data);
        } catch (error) {
            console.error('Error fetching request details:', error);
            toast.error('Failed to load request details');
        } finally {
            setLoadingRequestDetails(false);
        }
    };

    const handleViewRequest = async (requestId) => {
        setShowRequestModal(true);
        await fetchRequestDetails(requestId);
    };

    const handleAcceptResponse = async (responseId) => {
        try {
            await resourceExchangeService.updateResponseStatus(responseId, 'accepted');
            toast.success('Response accepted successfully!');
            await fetchRequestDetails(selectedRequest.id);
            await fetchData();
        } catch (error) {
            console.error('Error accepting response:', error);
            toast.error('Failed to accept response');
        }
    };

    const handleRejectResponse = async (responseId) => {
        try {
            await resourceExchangeService.updateResponseStatus(responseId, 'rejected');
            toast.success('Response rejected');
            await fetchRequestDetails(selectedRequest.id);
            await fetchData();
        } catch (error) {
            console.error('Error rejecting response:', error);
            toast.error('Failed to reject response');
        }
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        
        if (!createForm.device_type.trim() || !createForm.description.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            await resourceExchangeService.createRequest({
                ...createForm,
                specifications: createForm.specifications
            });
            
            toast.success('Resource exchange request created successfully!');
            
            // Reset form and refresh data
            setCreateForm({
                device_type: '',
                description: '',
                urgency: 'medium',
                preferred_exchange_date: '',
                specifications: {
                    brand: '',
                    model: '',
                    condition: '',
                    additional_specs: ''
                }
            });
            
            setActiveTab('my-requests');
            await fetchData();
        } catch (error) {
            console.error('Error creating request:', error);
            toast.error(error.message || 'Failed to create request');
        }
    };

    const handleCreateResponse = async (e) => {
        e.preventDefault();
        
        if (!responseForm.offer_description.trim()) {
            toast.error('Please describe your offer');
            return;
        }

        try {
            await resourceExchangeService.createResponse(responseForm.selectedRequestId, {
                offer_description: responseForm.offer_description,
                terms: responseForm.terms
            });
            
            toast.success('Response submitted successfully!');
            
            // Reset form and close modal
            setResponseForm({
                selectedRequestId: null,
                offer_description: '',
                terms: '',
                showResponseModal: false
            });
            
            await fetchData();
        } catch (error) {
            console.error('Error creating response:', error);
            toast.error(error.message || 'Failed to submit response');
        }
    };

    const openResponseModal = (requestId) => {
        setResponseForm({
            ...responseForm,
            selectedRequestId: requestId,
            showResponseModal: true
        });
    };

    const closeResponseModal = () => {
        setResponseForm({
            selectedRequestId: null,
            offer_description: '',
            terms: '',
            showResponseModal: false
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not specified';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getUrgencyIcon = (urgency) => {
        switch (urgency) {
            case 'high': return <AlertCircle className="w-4 h-4" />;
            case 'medium': return <Clock className="w-4 h-4" />;
            case 'low': return <CheckCircle className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const renderRequestCard = (request, isOwnRequest = false) => {
        const urgencyFormat = resourceExchangeService.formatUrgency(request.urgency);
        const statusFormat = resourceExchangeService.formatStatus(request.status);

        return (
            <motion.div
                key={request.id}
                className="bg-white bg-opacity-95 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Request Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-primary-100 rounded-lg">
                                <Monitor className="w-6 h-6 text-primary-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {request.device_type}
                                </h3>
                                <p className="text-sm text-gray-600">Request ID: {request.request_id}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusFormat.bgColor} ${statusFormat.color}`}>
                                {statusFormat.label}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span>{request.requester_department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{request.requester_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(request.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {getUrgencyIcon(request.urgency)}
                                <span className={`font-medium ${urgencyFormat.color}`}>
                                    {urgencyFormat.label} Priority
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Request Description */}
                <div className="mb-4">
                    <p className="text-gray-800 mb-3 line-clamp-3">{request.description}</p>
                    
                    {request.specifications && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                                <Cpu className="w-4 h-4" />
                                Technical Specifications
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {request.specifications.brand && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Brand:</span>
                                        <span className="text-gray-800">{request.specifications.brand}</span>
                                    </div>
                                )}
                                {request.specifications.model && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Model:</span>
                                        <span className="text-gray-800">{request.specifications.model}</span>
                                    </div>
                                )}
                                {request.specifications.condition && (
                                    <div className="flex justify-between">
                                        <span className="font-medium text-gray-600">Condition:</span>
                                        <span className="text-gray-800">{request.specifications.condition}</span>
                                    </div>
                                )}
                            </div>
                            {request.specifications.additional_specs && (
                                <div className="mt-3 pt-3 border-t border-gray-200 text-sm">
                                    <span className="font-medium text-gray-600">Additional Requirements:</span>
                                    <p className="text-gray-800 mt-1">{request.specifications.additional_specs}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Preferred Date */}
                {request.preferred_exchange_date && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Preferred Exchange Date:</span>
                            <span>{formatDate(request.preferred_exchange_date)}</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{request.response_count || 0} responses</span>
                        </div>
                        {isOwnRequest && request.response_count > 0 && (
                            <div className="text-green-600 font-medium">
                                New responses available!
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleViewRequest(request.id)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Eye size={16} />
                            <span>View Details</span>
                        </button>

                        {!isOwnRequest && request.status === 'open' && (
                            <button
                                onClick={() => openResponseModal(request.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                <ArrowRight size={16} />
                                <span>Respond</span>
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    // Request Details Modal
    const renderRequestDetailsModal = () => {
        if (!showRequestModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <motion.div
                    className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {loadingRequestDetails ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading request details...</p>
                        </div>
                    ) : selectedRequest ? (
                        <div className="p-6">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.device_type}</h2>
                                    <p className="text-gray-600">Request ID: {selectedRequest.request_id}</p>
                                </div>
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <XCircle className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Request Information */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Request Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-600">Status:</span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${resourceExchangeService.formatStatus(selectedRequest.status).bgColor} ${resourceExchangeService.formatStatus(selectedRequest.status).color}`}>
                                                {resourceExchangeService.formatStatus(selectedRequest.status).label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-600">Priority:</span>
                                            <span className={`font-medium ${resourceExchangeService.formatUrgency(selectedRequest.urgency).color}`}>
                                                {resourceExchangeService.formatUrgency(selectedRequest.urgency).label}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-600">Created:</span>
                                            <span>{formatDateTime(selectedRequest.created_at)}</span>
                                        </div>
                                        {selectedRequest.preferred_exchange_date && (
                                            <div className="flex justify-between">
                                                <span className="font-medium text-gray-600">Preferred Date:</span>
                                                <span>{formatDate(selectedRequest.preferred_exchange_date)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Requester Information</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <User className="w-5 h-5 text-gray-500" />
                                            <span>{selectedRequest.requester_name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Building className="w-5 h-5 text-gray-500" />
                                            <span>{selectedRequest.requester_department}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-gray-500" />
                                            <span>{selectedRequest.requester_email}</span>
                                        </div>
                                        {selectedRequest.requester_phone && (
                                            <div className="flex items-center gap-3">
                                                <Phone className="w-5 h-5 text-gray-500" />
                                                <span>{selectedRequest.requester_phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg">{selectedRequest.description}</p>
                            </div>

                            {/* Specifications */}
                            {selectedRequest.specifications && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Technical Specifications</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {Object.entries(selectedRequest.specifications).map(([key, value]) => {
                                                if (!value) return null;
                                                return (
                                                    <div key={key} className="flex justify-between">
                                                        <span className="font-medium text-gray-600 capitalize">
                                                            {key.replace('_', ' ')}:
                                                        </span>
                                                        <span className="text-gray-800">{value}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Responses Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                    Responses ({selectedRequest.responses?.length || 0})
                                </h3>
                                
                                {selectedRequest.responses && selectedRequest.responses.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedRequest.responses.map((response) => (
                                            <div key={response.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                            <User className="w-5 h-5 text-primary-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{response.responder_name}</h4>
                                                            <p className="text-sm text-gray-600">{response.responder_department}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                                                            response.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                            response.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {response.status.charAt(0).toUpperCase() + response.status.slice(1)}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDateTime(response.response_date)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mb-3">
                                                    <h5 className="font-medium text-gray-800 mb-2">Offer:</h5>
                                                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{response.offer_description}</p>
                                                </div>

                                                {response.terms && (
                                                    <div className="mb-3">
                                                        <h5 className="font-medium text-gray-800 mb-2">Terms & Conditions:</h5>
                                                        <p className="text-gray-700 bg-gray-50 p-3 rounded">{response.terms}</p>
                                                    </div>
                                                )}

                                                {response.offered_device_name && (
                                                    <div className="mb-3">
                                                        <h5 className="font-medium text-gray-800 mb-2">Offered Device:</h5>
                                                        <div className="bg-blue-50 p-3 rounded flex items-center gap-2">
                                                            <Monitor className="w-4 h-4 text-blue-600" />
                                                            <span className="text-blue-800">
                                                                {response.offered_device_name} 
                                                                {response.offered_device_brand && ` (${response.offered_device_brand})`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Response Actions (only for request owner and pending responses) */}
                                                {selectedRequest.requester_user_id === user?.id && response.status === 'pending' && (
                                                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                                                        <button
                                                            onClick={() => handleAcceptResponse(response.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                        >
                                                            <ThumbsUp size={16} />
                                                            <span>Accept</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectResponse(response.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            <ThumbsDown size={16} />
                                                            <span>Reject</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-600">No responses yet</p>
                                        <p className="text-sm text-gray-500">Be the first to respond to this request!</p>
                                    </div>
                                )}
                            </div>

                            {/* Response Button */}
                            {selectedRequest.requester_user_id !== user?.id && selectedRequest.status === 'open' && (
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            setShowRequestModal(false);
                                            openResponseModal(selectedRequest.id);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        <ArrowRight size={18} />
                                        <span>Submit Response</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                            <p className="text-gray-600">Failed to load request details</p>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className='flex-1 overflow-auto relative z-10'>
                <Header title='Resource Exchange' />
                <main className='max-w-6xl mx-auto py-6 px-4 lg:px-8'>
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                            <p className="mt-4 text-secondary-600">Loading resource exchange data...</p>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className='flex-1 overflow-auto relative z-10'>
            <Header title='Resource Exchange' />

            <main className='max-w-6xl mx-auto py-6 px-4 lg:px-8'>
                {/* Page Header */}
                <motion.div
                    className="mb-8 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <Monitor className="w-8 h-8 text-primary-600" />
                        <h1 className="text-3xl font-bold text-primary-800">Resource Exchange</h1>
                    </div>
                    <p className="text-secondary-600 mb-4">
                        Request electronic devices or respond to requests from other departments. 
                        Share resources efficiently across your organization.
                    </p>
                    
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('browse')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'browse' 
                                    ? 'bg-primary-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Browse Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('my-requests')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'my-requests' 
                                    ? 'bg-primary-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            My Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('create')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeTab === 'create' 
                                    ? 'bg-primary-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <Plus className="w-4 h-4 inline mr-2" />
                            Create Request
                        </button>
                    </div>
                </motion.div>

                {/* Tab Content */}
                {activeTab === 'browse' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-primary-800">Available Requests</h3>
                        {requests.length === 0 ? (
                            <motion.div
                                className="text-center py-12 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">No requests available</h3>
                                <p className="text-gray-500">Check back later or create your own request!</p>
                            </motion.div>
                        ) : (
                            <div className="grid gap-6">
                                {requests.map(request => renderRequestCard(request, false))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'my-requests' && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-primary-800">My Requests</h3>
                        {myRequests.length === 0 ? (
                            <motion.div
                                className="text-center py-12 bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl border border-primary-200"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <Monitor className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-600 mb-2">No requests yet</h3>
                                <p className="text-gray-500">Create your first resource exchange request!</p>
                            </motion.div>
                        ) : (
                            <div className="grid gap-6">
                                {myRequests.map(request => renderRequestCard(request, true))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'create' && (
                    <motion.div
                        className="bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h3 className="text-xl font-semibold text-primary-800 mb-6">Create Resource Exchange Request</h3>
                        
                        <form onSubmit={handleCreateRequest} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Device Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Device Type *
                                    </label>
                                    <input
                                        type="text"
                                        value={createForm.device_type}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, device_type: e.target.value }))}
                                        placeholder="e.g., Laptop, Desktop, Printer, Projector"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                {/* Urgency */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Urgency
                                    </label>
                                    <select
                                        value={createForm.urgency}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, urgency: e.target.value }))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>

                                {/* Preferred Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Preferred Exchange Date
                                    </label>
                                    <input
                                        type="date"
                                        value={createForm.preferred_exchange_date}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, preferred_exchange_date: e.target.value }))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description *
                                </label>
                                <textarea
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Describe what you need, why you need it, and any specific requirements..."
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                    rows={4}
                                    required
                                />
                            </div>

                            {/* Specifications */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Specifications (Optional)
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <input
                                        type="text"
                                        value={createForm.specifications.brand}
                                        onChange={(e) => setCreateForm(prev => ({ 
                                            ...prev, 
                                            specifications: { ...prev.specifications, brand: e.target.value }
                                        }))}
                                        placeholder="Brand"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={createForm.specifications.model}
                                        onChange={(e) => setCreateForm(prev => ({ 
                                            ...prev, 
                                            specifications: { ...prev.specifications, model: e.target.value }
                                        }))}
                                        placeholder="Model"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={createForm.specifications.condition}
                                        onChange={(e) => setCreateForm(prev => ({ 
                                            ...prev, 
                                            specifications: { ...prev.specifications, condition: e.target.value }
                                        }))}
                                        placeholder="Condition"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <textarea
                                    value={createForm.specifications.additional_specs}
                                    onChange={(e) => setCreateForm(prev => ({ 
                                        ...prev, 
                                        specifications: { ...prev.specifications, additional_specs: e.target.value }
                                    }))}
                                    placeholder="Additional specifications or requirements..."
                                    className="w-full mt-3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    <span>Create Request</span>
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* Response Modal */}
                {responseForm.showResponseModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <motion.div
                            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Respond to Request</h3>
                            
                            <form onSubmit={handleCreateResponse} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Your Offer *
                                    </label>
                                    <textarea
                                        value={responseForm.offer_description}
                                        onChange={(e) => setResponseForm(prev => ({ ...prev, offer_description: e.target.value }))}
                                        placeholder="Describe what you can offer and any details about the device..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                        rows={4}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Terms & Conditions (Optional)
                                    </label>
                                    <textarea
                                        value={responseForm.terms}
                                        onChange={(e) => setResponseForm(prev => ({ ...prev, terms: e.target.value }))}
                                        placeholder="Any specific terms, conditions, or requirements for the exchange..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                        rows={3}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeResponseModal}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                    >
                                        Submit Response
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* Request Details Modal */}
                {renderRequestDetailsModal()}
            </main>
        </div>
    );
};

export default ResourceExchangePage;