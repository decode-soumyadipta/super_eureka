import { Route, Routes, useLocation } from "react-router-dom";

import Sidebar from "./components/common/Sidebar";

import OverviewPage from "./pages/OverviewPage";
import HOverviewPage from "./pages_hod/HOverviewPage.jsx";
import ProductsPage from "./pages_hod/ProductsPage";
import UsersPage from "./pages/UsersPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DashboardLogin from './pages/DashboardLogin';

function App() {
    const location = useLocation();
    const isLoginPage = location.pathname === "/Login";

    return (
        <div className='flex h-screen bg-gray-900 text-gray-100 overflow-hidden'>
            {/* BG */}
            <div className='fixed inset-0 z-0'>
                <div className='absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80' />
                <div className='absolute inset-0 backdrop-blur-sm' />
            </div>

            {!isLoginPage && <Sidebar />} {/* Conditionally render Sidebar */}
            <Routes>
                <Route path='/admin' element={<OverviewPage />} />
                <Route path='/HOD' element={<HOverviewPage />} />
                <Route path='/HOD/products' element={<ProductsPage />} />
                <Route path='/admin/users' element={<UsersPage />} />
                <Route path='/admin/analytics' element={<AnalyticsPage />} />
                <Route path="/Login" element={<DashboardLogin />} />
            </Routes>
        </div>
    );
}

export default App;