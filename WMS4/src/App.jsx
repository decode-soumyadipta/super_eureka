import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Sidebar from "./components/common/Sidebar";

import OverviewPage from "./pages/OverviewPage";
import HOverviewPage from "./pages_hod/HOverviewPage.jsx";
import ProductsPage from "./pages_hod/ProductsPage";
import UsersPage from "./pages/UsersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DisposalPage from "./pages/DisposalPage";
import DashboardLogin from './pages/DashboardLogin';
import CommunityPage from './pages/CommunityPage';
import ResourceExchangePage from './pages/ResourceExchangePage';
import { authService } from './services/authService.js';
import IPFSUploadPage from './pages/IPFSUploadPage.jsx';

// Protected Route component
const ProtectedRoute = ({ children, adminOnly = false }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (authService.isAuthenticated()) {
                    const currentUser = authService.getCurrentUser();
                    setUser(currentUser);
                    setIsAuthenticated(true);
                    
                    // Verify token is still valid by making an API call
                    await authService.getProfile();
                } else {
                    setIsAuthenticated(false);
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsAuthenticated(false);
                authService.logout();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
                    <p className="mt-4 text-secondary-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/Login" replace />;
    }

    if (adminOnly && user?.role !== 'admin') {
        return <Navigate to="/HOD" replace />;
    }

    return children;
};

function App() {
    const location = useLocation();
    const isLoginPage = location.pathname === "/Login" || location.pathname === "/";

    return (
        <div className='flex h-screen bg-white text-secondary-900 overflow-hidden'>
            {/* BG */}
            <div className='fixed inset-0 z-0'>
                <div className='absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100 opacity-80' />
                <div className='absolute inset-0 backdrop-blur-sm' />
            </div>

            {!isLoginPage && <Sidebar />}
            <Routes>
                {/* Public routes */}
                <Route path="/Login" element={<DashboardLogin />} />
                <Route path="/" element={<Navigate to="/Login" replace />} />
                
                {/* Protected admin routes */}
                <Route path='/admin' element={
                    <ProtectedRoute adminOnly={true}>
                        <OverviewPage />
                    </ProtectedRoute>
                } />
                <Route path='/admin/users' element={
                    <ProtectedRoute adminOnly={true}>
                        <UsersPage />
                    </ProtectedRoute>
                } />
                <Route path='/admin/analytics' element={
                    <ProtectedRoute adminOnly={true}>
                        <AnalyticsPage />
                    </ProtectedRoute>
                } />
                <Route path='/admin/disposal' element={
                    <ProtectedRoute adminOnly={true}>
                        <DisposalPage />
                    </ProtectedRoute>
                } />
                
                {/* Protected user routes */}
                <Route path='/HOD' element={
                    <ProtectedRoute>
                        <HOverviewPage />
                    </ProtectedRoute>
                } />
                <Route path='/HOD/products' element={
                    <ProtectedRoute>
                        <ProductsPage />
                    </ProtectedRoute>
                } />
                <Route path='/HOD/disposal' element={
                    <ProtectedRoute>
                        <DisposalPage />
                    </ProtectedRoute>
                } />
                <Route path='/disposal' element={
                    <ProtectedRoute>
                        <DisposalPage />
                    </ProtectedRoute>
                } />
                <Route path='/community' element={
                    <ProtectedRoute>
                        <CommunityPage />
                    </ProtectedRoute>
                } />
                <Route path='/resource-exchange' element={
                    <ProtectedRoute>
                        <ResourceExchangePage />
                    </ProtectedRoute>
                } />
                <Route path='/ipfs-upload' element={
                    <ProtectedRoute>
                        <IPFSUploadPage />
                    </ProtectedRoute>
                } />
                
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/Login" replace />} />
            </Routes>
        </div>
    );
}

export default App;