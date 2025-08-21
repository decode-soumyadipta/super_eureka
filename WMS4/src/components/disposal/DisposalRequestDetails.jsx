import { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Scale as ScaleIcon,
  Inventory as PackageIcon
} from '@mui/icons-material';

// Status color mapping for Material-UI
const statusColors = {
  pending: 'warning',
  approved: 'info',
  in_progress: 'primary',
  completed: 'success',
  rejected: 'error',
  cancelled: 'default'
};

function DisposalRequestDetails({ request, onUpdateStatus, loading = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    vendor_notes: ''
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (request) {
      setEditForm({
        status: request.status || '',
        vendor_notes: request.vendor_notes || ''
      });
    }
  }, [request]);

  const handleEditSave = async () => {
    try {
      setError(null);
      await onUpdateStatus(request.request_id, editForm);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'An error occurred while updating request');
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditForm({
      status: request?.status || '',
      vendor_notes: request?.vendor_notes || ''
    });
    setError(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!request) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          No request details available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" component="h2" gutterBottom>
                Request ID: {request.request_id}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(request.created_at)}
              </Typography>
            </Box>
            <Box>
              {isEditing ? (
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    label="Status"
                  >
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Chip 
                  label={request.status?.charAt(0).toUpperCase() + request.status?.slice(1).replace('_', ' ')} 
                  color={statusColors[request.status] || 'default'}
                  size="medium"
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Contact Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                Contact Information
              </Typography>
              <Box sx={{ space: 2 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Department:</Typography>
                  <Typography variant="body1">{request.department || 'N/A'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Contact Name:</Typography>
                  <Typography variant="body1">{request.contact_name || 'N/A'}</Typography>
                </Box>
                {request.contact_phone && (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 'small' }} />
                    <Typography variant="body1">{request.contact_phone}</Typography>
                  </Box>
                )}
                {request.contact_email && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 'small' }} />
                    <Typography variant="body1">{request.contact_email}</Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Pickup Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pickup Information
              </Typography>
              {request.pickup_address && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                  <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 'small', mt: 0.5 }} />
                  <Typography variant="body1">{request.pickup_address}</Typography>
                </Box>
              )}
              {request.preferred_date && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 'small' }} />
                  <Typography variant="body1">
                    Preferred Date: {formatDate(request.preferred_date)}
                    {request.preferred_time_slot && ` (${request.preferred_time_slot})`}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* E-Waste Information */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                E-Waste Details
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {request.e_waste_description || request.description || 'No description provided'}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ScaleIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 'small' }} />
                    <Typography variant="body1">
                      Weight: {request.weight_kg || request.e_waste_weight ? `${request.weight_kg || request.e_waste_weight} kg` : 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PackageIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 'small' }} />
                    <Typography variant="body1">
                      Items: {request.item_count || request.e_waste_item_count || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              {request.additional_notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Additional Notes:
                  </Typography>
                  <Typography variant="body1">{request.additional_notes}</Typography>
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Vendor Notes:
              </Typography>
              {isEditing ? (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={editForm.vendor_notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, vendor_notes: e.target.value }))}
                  placeholder="Add vendor notes..."
                  variant="outlined"
                />
              ) : (
                <Typography variant="body1">
                  {request.vendor_notes || 'No vendor notes available'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        {isEditing ? (
          <>
            <Button 
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleEditCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleEditSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button 
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            disabled={loading}
          >
            Edit Status
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default DisposalRequestDetails;