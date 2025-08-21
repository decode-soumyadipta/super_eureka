import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, TextField, Grid, Button, Alert } from '@mui/material';

function LocationPicker({ onLocationChange, initialLocation = null }) {
  const [position, setPosition] = useState(initialLocation || [20.5937, 78.9629]);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Initialize map automatically on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeMap();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const initializeMap = useCallback(async () => {
    if (mapError) return; // Don't retry if there's an error
    
    try {
      setMapError(null);
      
      const mapElement = document.getElementById('location-map');
      if (!mapElement) {
        console.log('Map container not found, retrying...');
        setTimeout(initializeMap, 1000);
        return;
      }

      // Clear any existing map
      if (mapElement._leaflet_map) {
        mapElement._leaflet_map.remove();
        mapElement._leaflet_map = null;
      }

      mapElement.innerHTML = '';

      // Load Leaflet CSS first if not already loaded
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.7.1/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Import Leaflet
      const L = await import('leaflet');
      const leaflet = L.default || L;

      // Fix marker icons
      delete leaflet.Icon.Default.prototype._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });

      // Get initial position
      let initialPos = position;
      
      // Try to get current location if no initial location provided
      if (!initialLocation && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          initialPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(initialPos);
          onLocationChange({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: address
          });
        } catch (geoError) {
          console.log('Geolocation failed, using default position');
        }
      }

      // Create map
      const map = leaflet.map(mapElement, {
        center: initialPos,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true
      });

      mapElement._leaflet_map = map;

      // Add tile layer
      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Create draggable marker
      const marker = leaflet.marker(initialPos, { 
        draggable: true,
        autoPan: true
      }).addTo(map);

      // Create popup
      const popup = leaflet.popup({ 
        closeButton: false, 
        autoClose: false,
        className: 'address-popup'
      })
        .setLatLng(initialPos)
        .setContent("Determining address...")
        .openOn(map);

      marker.bindPopup(popup).openPopup();

      // Handle marker drag
      marker.on('dragend', function (e) {
        const latLng = marker.getLatLng();
        updatePosition(latLng.lat, latLng.lng);
        popup.setLatLng(latLng);
        geocodeLatLng(latLng.lat, latLng.lng, popup);
      });

      // Handle map click
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        popup.setLatLng(e.latlng);
        updatePosition(e.latlng.lat, e.latlng.lng);
        geocodeLatLng(e.latlng.lat, e.latlng.lng, popup);
      });

      // Update popup when marker moves
      marker.on('move', function(e) {
        popup.setLatLng(e.latlng);
      });

      setMapInitialized(true);
      setMapError(null);
      
      // Get initial address
      geocodeLatLng(initialPos[0], initialPos[1], popup);

    } catch (error) {
      console.error('Error creating map:', error);
      setMapError('Map temporarily unavailable. You can enter address manually below.');
      setMapInitialized(false);
    }
  }, [initialLocation, position, address, onLocationChange, mapError]);

  const updatePosition = (lat, lng) => {
    const newPosition = [lat, lng];
    setPosition(newPosition);
    onLocationChange({
      latitude: lat,
      longitude: lng,
      address: address
    });
  };

  const geocodeLatLng = async (lat, lng, popup = null) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'E-Waste Management System'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data && data.display_name) {
        setAddress(data.display_name);
        onLocationChange({
          latitude: lat,
          longitude: lng,
          address: data.display_name
        });
        if (popup) {
          popup.setContent(data.display_name);
        }
      } else {
        const fallbackAddress = 'Address not available for this location';
        setAddress(fallbackAddress);
        if (popup) {
          popup.setContent(fallbackAddress);
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
      const errorAddress = `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddress(errorAddress);
      if (popup) {
        popup.setContent(errorAddress);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const newPosition = [lat, lng];
          setPosition(newPosition);
          
          // Update map if initialized
          if (mapInitialized) {
            const mapElement = document.getElementById('location-map');
            if (mapElement && mapElement._leaflet_map) {
              const map = mapElement._leaflet_map;
              map.setView(newPosition, 13);
              // Update marker position
              map.eachLayer((layer) => {
                if (layer.options && layer.options.draggable) {
                  layer.setLatLng(newPosition);
                  if (layer.getPopup()) {
                    layer.getPopup().setLatLng(newPosition);
                  }
                }
              });
            }
          }
          
          geocodeLatLng(lat, lng);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLoading(false);
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
          maximumAge: 300000
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
      setLoading(false);
    }
  };

  const handleManualAddressChange = (event) => {
    const value = event.target.value;
    setAddress(value);
    onLocationChange({
      latitude: position[0],
      longitude: position[1],
      address: value
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Pickup Location
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
        Use the map to select location or enter address manually. Both methods work.
      </Typography>

      {/* Single Address Field - Can be filled manually or automatically */}
      <TextField
        fullWidth
        multiline
        rows={3}
        label="Pickup Address *"
        value={address}
        onChange={handleManualAddressChange}
        placeholder="Enter pickup address manually or use map below to auto-detect"
        sx={{ mb: 2 }}
        helperText="This field will auto-fill when you use the map, or you can type manually"
      />

      {mapError && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {mapError}
        </Alert>
      )}

      {/* Map Container */}
      <Box 
        id="location-map" 
        sx={{ 
          height: mapError ? '200px' : '400px',
          width: '100%', 
          border: '1px solid #e0e0e0', 
          borderRadius: '8px', 
          mb: 2,
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
          display: mapError ? 'none' : 'block'
        }}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Latitude"
            value={position[0].toFixed(6)}
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Longitude"
            value={position[1].toFixed(6)}
            size="small"
            InputProps={{ readOnly: true }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item>
          <Button
            variant="outlined"
            onClick={getCurrentLocation}
            disabled={loading}
            size="small"
          >
            {loading ? 'Getting Location...' : 'Use Current Location'}
          </Button>
        </Grid>
        {mapError && (
          <Grid item>
            <Button
              variant="outlined"
              onClick={initializeMap}
              disabled={loading}
              size="small"
              color="primary"
            >
              Retry Map Loading
            </Button>
          </Grid>
        )}
      </Grid>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        {mapInitialized 
          ? 'Drag the red marker or click on the map to set location. Address will auto-fill above.'
          : 'Enter address manually in the field above, or try loading the map for precise location.'
        }
      </Typography>
    </Box>
  );
}

export default LocationPicker;