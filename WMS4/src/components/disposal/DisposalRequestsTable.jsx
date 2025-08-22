import React, { useState } from 'react';
import { 
  Box, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  IconButton,
  InputAdornment
} from '@mui/material';
import { 
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

// Status chip color mapping
const statusColors = {
  pending: 'warning',
  approved: 'info',
  in_progress: 'primary',
  completed: 'success',
  pickup_scheduled: 'info',
  out_for_pickup: 'warning',
  pickup_completed: 'success',
  rejected: 'error',
  cancelled: 'default'
};

function DisposalRequestsTable({ requests, loading, onViewRequest }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Handle page change
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filter and sort requests
  const filteredRequests = requests.filter((request) => {
    // Filter by status
    if (filterStatus !== 'all' && request.status !== filterStatus) {
      return false;
    }
    
    // Search by ID, department, or description
    if (searchTerm && !( 
      request.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.e_waste_description?.toLowerCase().includes(searchTerm.toLowerCase())
    )) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Handle sorting
    if (sortBy === 'created_at') {
      return sortDirection === 'asc' 
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at);
    }
    
    if (sortDirection === 'asc') {
      return a[sortBy] > b[sortBy] ? 1 : -1;
    } else {
      return a[sortBy] < b[sortBy] ? 1 : -1;
    }
  });
  
  // Paginate the results
  const paginatedRequests = filteredRequests.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Filters and Search */}
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          sx={{ flexGrow: 1, minWidth: 180 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="status-filter-label">Status</InputLabel>
          <Select
            labelId="status-filter-label"
            value={filterStatus}
            label="Status"
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
            startAdornment={
              <InputAdornment position="start">
                <FilterIcon />
              </InputAdornment>
            }
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="sort-by-label">Sort By</InputLabel>
          <Select
            labelId="sort-by-label"
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="created_at">Date Created</MenuItem>
            <MenuItem value="status">Status</MenuItem>
            <MenuItem value="department_name">Department</MenuItem>
            <MenuItem value="e_waste_weight">Weight</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="sort-direction-label">Direction</InputLabel>
          <Select
            labelId="sort-direction-label"
            value={sortDirection}
            label="Direction"
            onChange={(e) => setSortDirection(e.target.value)}
          >
            <MenuItem value="desc">Newest First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Requests Count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Showing {filteredRequests.length} of {requests.length} requests
      </Typography>

      {/* Table */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table sx={{ minWidth: 700 }} size="medium" aria-label="disposal requests table">
          <TableHead>
            <TableRow>
              <TableCell>Request ID</TableCell>
              <TableCell>Created On</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Weight (kg)</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Loading...</TableCell>
              </TableRow>
            ) : paginatedRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No disposal requests found</TableCell>
              </TableRow>
            ) : (
              paginatedRequests.map((request) => (
                <TableRow key={request.request_id} hover>
                  <TableCell component="th" scope="row">
                    {request.request_id}
                  </TableCell>
                  <TableCell>{formatDate(request.created_at)}</TableCell>
                  <TableCell>{request.department || 'N/A'}</TableCell>
                  <TableCell>
                    {request.e_waste_description ? 
                      (request.e_waste_description.length > 50 
                        ? `${request.e_waste_description.substring(0, 50)}...` 
                        : request.e_waste_description) 
                      : 'N/A'}
                  </TableCell>
                  <TableCell align="center">{request.item_count || 'N/A'}</TableCell>
                  <TableCell align="center">{request.weight_kg ? `${request.weight_kg} kg` : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={request.status?.charAt(0).toUpperCase() + request.status?.slice(1).replace('_', ' ')} 
                      color={statusColors[request.status] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => {
                        console.log('🔍 Viewing request:', {
                          request_id: request.request_id,
                          id: request.id,
                          full_request: request
                        });
                        // Use either request_id or id, whichever is available
                        const requestId = request.request_id || request.id;
                        if (requestId) {
                          onViewRequest(requestId);
                        } else {
                          console.error('❌ No valid ID found for request:', request);
                          alert('Error: This request does not have a valid ID');
                        }
                      }}
                      title="View details"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredRequests.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}

export default DisposalRequestsTable;