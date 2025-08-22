import { Route, Routes, useLocation, Navigate } from "react-router-dom";

import Sidebar from "./components/common/Sidebar";
import ProtectedRoute from "./components/common/ProtectedRoute";

import OverviewPage from "./pages/OverviewPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";

function App() {
	const location = useLocation();
	const isLoginPage = location.pathname === "/login";

	return (
		<div className='flex h-screen bg-gray-900 text-gray-100 overflow-hidden'>
			{/* BG */}
			<div className='fixed inset-0 z-0'>
				<div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80' />
				<div className='absolute inset-0 backdrop-blur-sm' />
			</div>

			{!isLoginPage && <Sidebar />}
			<Routes>
				{/* Public routes */}
				<Route path="/login" element={<LoginPage />} />
				
				 {/* Default redirect */}
				<Route path="/" element={
					<ProtectedRoute>
						<OverviewPage />
					</ProtectedRoute>
				} />
				
				{/* Protected routes */}
				<Route path='/dashboard' element={
					<ProtectedRoute>
						<OverviewPage />
					</ProtectedRoute>
				} />
				<Route path='/products' element={
					<ProtectedRoute>
						<ProductsPage />
					</ProtectedRoute>
				} />
				<Route path='/users' element={
					<ProtectedRoute>
						<UsersPage />
					</ProtectedRoute>
				} />
				
				{/* Catch all route */}
				<Route path="*" element={<Navigate to="/login" replace />} />
			</Routes>
		</div>
	);
}

export default App;
