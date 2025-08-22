import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import ApprovedRequestsPage from './pages/ApprovedRequestsPage';
import ScheduledRequestsPage from './pages/ScheduledRequestsPage';
import ProtectedRoute from './components/common/ProtectedRoute';
import Sidebar from './components/common/Sidebar';

function App() {
	const location = useLocation();
	const isLoginPage = location.pathname === '/login';

	return (
		<div className='min-h-screen bg-gray-900 text-white'>
			{isLoginPage ? (
				// Login page without sidebar
				<div className='h-screen bg-gray-900 text-white'>
					<Routes>
						<Route path='/login' element={<LoginPage />} />
						<Route path='*' element={<Navigate to='/login' replace />} />
					</Routes>
				</div>
			) : (
				// Protected pages with sidebar
				<div className='flex h-screen bg-gray-900 text-white'>
					<Sidebar />
					<div className='flex-1 flex flex-col'>
						<Routes>
							<Route path='/' element={
								<ProtectedRoute>
									<OverviewPage />
								</ProtectedRoute>
							} />
							<Route path='/approved-requests' element={
								<ProtectedRoute>
									<ApprovedRequestsPage />
								</ProtectedRoute>
							} />
							<Route path='/scheduled-requests' element={
								<ProtectedRoute>
									<ScheduledRequestsPage />
								</ProtectedRoute>
							} />
							<Route path='*' element={<Navigate to='/' replace />} />
						</Routes>
					</div>
				</div>
			)}
		</div>
	);
}

export default App;
