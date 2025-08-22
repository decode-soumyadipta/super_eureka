import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  Card,
  CardContent,
  FormHelperText,
  Divider
} from '@mui/material';
import LocationPicker from './LocationPicker';
import DeviceSelector from './DeviceSelector';

const timeSlots = [
  '9:00 AM - 11:00 AM',
  '11:00 AM - 1:00 PM',
  '1:00 PM - 3:00 PM',
  '3:00 PM - 5:00 PM'
];

const deviceTypes = [
  'Smartphone',
  'Laptop',
  'Desktop Computer',
  'Tablet',
  'Television',
  'Printer',
  'Router',
  'Smart Watch',
  'Gaming Console',
  'Other'
];

function DisposalRequestForm({ onSubmit, onCancel, loading = false, initialData = null }) {
  const [formData, setFormData] = useState({
    contactPhone: initialData?.contactPhone || '',
    preferredDate: initialData?.preferredDate || '',
    preferredTimeSlot: initialData?.preferredTimeSlot || '',
    specialInstructions: initialData?.specialInstructions || '',
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    fullAddress: initialData?.fullAddress || '',
    selectedDevices: initialData?.selectedDevices || [],
    weight_kg: initialData?.weight_kg || '', // Add weight field
    estimated_value: initialData?.estimated_value || '' // Add estimated value field
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDevicesSelected = (devices) => {
    setFormData(prev => ({
      ...prev,
      selectedDevices: devices
    }));
    // Clear device selection error
    if (errors.selectedDevices) {
      setErrors(prev => ({
        ...prev,
        selectedDevices: ''
      }));
    }
  };

  const handleLocationChange = (locationData) => {
    setFormData(prev => ({
      ...prev,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      fullAddress: locationData.address || ''
    }));
    // Clear location-related errors
    setErrors(prev => ({
      ...prev,
      latitude: '',
      longitude: ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Device selection validation
    if (!formData.selectedDevices || formData.selectedDevices.length === 0) {
      newErrors.selectedDevices = 'Please select at least one device for disposal';
    }

    // Address validation - either from map or manual input
    if (!formData.fullAddress) {
      newErrors.fullAddress = 'Pickup address is required (use map or enter manually)';
    }
    
    if (!formData.contactPhone) newErrors.contactPhone = 'Contact phone is required';
    if (!formData.preferredDate) newErrors.preferredDate = 'Preferred date is required';
    if (!formData.preferredTimeSlot) newErrors.preferredTimeSlot = 'Time slot is required';
    
    // Location validation
    if (!formData.latitude || !formData.longitude) {
      newErrors.latitude = 'Please select pickup location or get current coordinates';
      newErrors.longitude = 'Please select pickup location or get current coordinates';
    }

    // Validate phone number (basic validation)
    if (formData.contactPhone && !/^\d{10}$/.test(formData.contactPhone)) {
      newErrors.contactPhone = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }

    try {
      console.log('Starting form submission...');
      
      // Get current user data for required fields
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Prepare form data with simplified structure
      const submissionData = {
        // Core form fields
        contactPhone: formData.contactPhone,
        fullAddress: formData.fullAddress,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        preferredDate: formData.preferredDate,
        preferredTimeSlot: formData.preferredTimeSlot,
        specialInstructions: formData.specialInstructions,
        selectedDevices: formData.selectedDevices,
        
        // Additional data for backend
        contact_phone: formData.contactPhone,
        pickup_address: formData.fullAddress,
        preferred_date: formData.preferredDate,
        preferred_time_slot: formData.preferredTimeSlot,
        additional_notes: formData.specialInstructions,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        
        // Device information
        e_waste_description: formData.selectedDevices.length > 0 
          ? formData.selectedDevices.map(device => 
              `${device.device_type} - ${device.device_name} (${device.brand || 'Unknown Brand'})`
            ).join('; ')
          : 'E-waste disposal request',
        item_count: formData.selectedDevices.length
      };
      
      console.log('Submitting disposal request with data:', submissionData);
      
      const result = await onSubmit(submissionData);
      
      if (!result.success) {
        setErrors(prev => ({
          ...prev,
          submission: result.message || 'Failed to submit disposal request'
        }));
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors(prev => ({
        ...prev,
        submission: 'Failed to submit disposal request. Please try again.'
      }));
    }
  };

  return (
    <Card elevation={2} sx={{ maxWidth: '100%' }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          {initialData ? 'Edit Disposal Request' : 'New Disposal Request'}
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          {/* Device Selection */}
          <DeviceSelector
            onDevicesSelected={handleDevicesSelected}
            selectedDevices={formData.selectedDevices}
          />
          {errors.selectedDevices && (
            <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block', mb: 2 }}>
              {errors.selectedDevices}
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Device Information - Now Auto-filled from Selection */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
            Device Information Summary
          </Typography>
          
          {formData.selectedDevices.length > 0 ? (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Selected Devices ({formData.selectedDevices.length}):</strong>
              </Typography>
              {formData.selectedDevices.map((device, index) => (
                <Typography key={device.id} variant="body2" sx={{ ml: 2 }}>
                  {index + 1}. {device.device_name} ({device.device_type}) - {device.brand || 'Unknown Brand'}
                  {device.condition_status && ` - ${device.condition_status}`}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
              Select devices above to see summary here
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Pickup Information */}
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Pickup Information
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="fullAddress"
                label="Pickup Address *"
                value={formData.fullAddress}
                onChange={handleChange}
                placeholder="Complete pickup address"
                error={!!errors.fullAddress}
                helperText={errors.fullAddress}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                name="contactPhone"
                label="Contact Phone *"
                value={formData.contactPhone}
                onChange={handleChange}
                placeholder="10-digit phone number"
                error={!!errors.contactPhone}
                helperText={errors.contactPhone}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Location Selection with Map */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <LocationPicker
                onLocationChange={handleLocationChange}
                initialLocation={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
              />
              {(errors.latitude || errors.longitude) && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                  {errors.latitude}
                </Typography>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Schedule Information */}
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Schedule Pickup
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                name="preferredDate"
                label="Preferred Date *"
                value={formData.preferredDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
                error={!!errors.preferredDate}
                helperText={errors.preferredDate}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.preferredTimeSlot}>
                <InputLabel>Time Slot *</InputLabel>
                <Select
                  name="preferredTimeSlot"
                  value={formData.preferredTimeSlot}
                  onChange={handleChange}
                  label="Time Slot *"
                >
                  {timeSlots.map(slot => (
                    <MenuItem key={slot} value={slot}>{slot}</MenuItem>
                  ))}
                </Select>
                {errors.preferredTimeSlot && <FormHelperText>{errors.preferredTimeSlot}</FormHelperText>}
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Special Instructions */}
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Special Instructions
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            name="specialInstructions"
            label="Special Instructions"
            value={formData.specialInstructions}
            onChange={handleChange}
            placeholder="Any special instructions for pickup (e.g., gate code, floor number, etc.)"
          />

          {/* Weight and Estimated Value */}
          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Additional Information
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="weight_kg"
                label="Weight (kg)"
                value={formData.weight_kg}
                onChange={handleChange}
                placeholder="Estimated weight in kilograms"
                error={!!errors.weight_kg}
                helperText={errors.weight_kg}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                name="estimated_value"
                label="Estimated Value ($)"
                value={formData.estimated_value}
                onChange={handleChange}
                placeholder="Estimated value in dollars"
                error={!!errors.estimated_value}
                helperText={errors.estimated_value}
              />
            </Grid>
          </Grid>

          {/* Submit Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? 'Submitting...' : (initialData ? 'Update Request' : 'Submit Request')}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default DisposalRequestForm;