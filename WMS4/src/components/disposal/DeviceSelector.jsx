import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Alert,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { Search, QrCode, CheckCircle } from '@mui/icons-material';
import { deviceService } from '../../services/deviceService';

function DeviceSelector({ onDevicesSelected, selectedDevices = [] }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDevices, setFilteredDevices] = useState([]);

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceService.getDepartmentDevices();
      
      if (response.success) {
        setDevices(response.data.devices || []);
      } else {
        setError('Failed to fetch devices');
      }
    } catch (err) {
      console.error('Devices fetch error:', err);
      setError(err.message || 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const filterDevices = () => {
    let filtered = devices;

    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(device =>
        device.device_name?.toLowerCase().includes(lowercaseSearch) ||
        device.device_type?.toLowerCase().includes(lowercaseSearch) ||
        device.brand?.toLowerCase().includes(lowercaseSearch) ||
        device.device_id?.toLowerCase().includes(lowercaseSearch)
      );
    }

    setFilteredDevices(filtered);
  };

  const handleDeviceToggle = (device) => {
    const isSelected = selectedDevices.some(d => d.id === device.id);
    let updatedSelection;

    if (isSelected) {
      updatedSelection = selectedDevices.filter(d => d.id !== device.id);
    } else {
      updatedSelection = [...selectedDevices, {
        ...device,
        qr_data: {
          device_id: device.device_id,
          device_name: device.device_name,
          device_type: device.device_type,
          brand: device.brand,
          model: device.model,
          serial_number: device.serial_number,
          condition_status: device.condition_status,
          registration_date: device.registration_date,
          current_location: device.current_location,
          qr_code: device.qr_code
        }
      }];
    }

    onDevicesSelected(updatedSelection);
  };

  const getConditionColor = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'fair': return 'warning';
      case 'poor': return 'error';
      case 'damaged': return 'error';
      default: return 'default';
    }
  };

  const openQRCode = (qrCode) => {
    if (qrCode) {
      window.open(`http://localhost:3000?qr=${qrCode}`, '_blank');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading registered devices...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Select Devices for Disposal
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
        Choose from your registered devices. QR data will be shared with the vendor for transparency.
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search devices by name, type, brand, or ID..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Selected Devices Summary */}
      {selectedDevices.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Selected {selectedDevices.length} device(s) for disposal
          </Typography>
          <Box sx={{ mt: 1 }}>
            {selectedDevices.map((device) => (
              <Chip
                key={device.id}
                label={`${device.device_name} (${device.device_type})`}
                onDelete={() => handleDeviceToggle(device)}
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </Box>
        </Alert>
      )}

      {/* Devices Grid */}
      {filteredDevices.length === 0 ? (
        <Alert severity="warning">
          No devices found. {searchTerm ? 'Try adjusting your search term.' : 'Register devices first to request disposal.'}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredDevices.map((device) => {
            const isSelected = selectedDevices.some(d => d.id === device.id);
            
            return (
              <Grid item xs={12} sm={6} md={4} key={device.id}>
                <Card 
                  sx={{ 
                    border: isSelected ? '2px solid #4caf50' : '1px solid #e0e0e0',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: 2,
                      transform: 'translateY(-2px)'
                    }
                  }}
                  onClick={() => handleDeviceToggle(device)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleDeviceToggle(device)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label=""
                        sx={{ m: 0 }}
                      />
                      {isSelected && <CheckCircle color="success" />}
                    </Box>

                    <Typography variant="h6" gutterBottom>
                      {device.device_name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      ID: {device.device_id}
                    </Typography>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Type:</strong> {device.device_type}
                      </Typography>
                      {device.brand && (
                        <Typography variant="body2">
                          <strong>Brand:</strong> {device.brand} {device.model || ''}
                        </Typography>
                      )}
                      {device.serial_number && (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                          S/N: {device.serial_number}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={device.condition_status || 'Unknown'} 
                        color={getConditionColor(device.condition_status)}
                        size="small"
                      />
                      <Button
                        size="small"
                        startIcon={<QrCode />}
                        onClick={(e) => {
                          e.stopPropagation();
                          openQRCode(device.qr_code);
                        }}
                      >
                        QR
                      </Button>
                    </Box>

                    {device.current_location && (
                      <Typography variant="caption" color="text.secondary">
                        Location: {device.current_location}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

export default DeviceSelector;