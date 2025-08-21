import { BarChart2, DollarSign, Menu, QrCode, Settings, ShoppingBag, ShoppingCart, TrendingUp, Users, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../../services/authService.js";

const SIDEBAR_ITEMS = [
	{
		name: "Overview",
		icon: BarChart2,
		color: "#4caf50",
		href: "/admin",
		adminOnly: true
	},
	{
		name: "Overview",
		icon: BarChart2,
		color: "#4caf50",
		href: "/HOD",
		userOnly: true
	},
	{ 
		name: "Repair Centers", 
		icon: Users, 
		color: "#45a049", 
		href: "/admin/users",
		adminOnly: true
	},
	{ 
		name: "Device Management", 
		icon: ShoppingBag, 
		color: "#388e3c", 
		href: "/HOD/products",
		userOnly: true
	},
	{ 
		name: "QR Scanner", 
		icon: QrCode, 
		color: "#388e3c", 
		href: "http://localhost:3000",
		external: true
	},
	{ 
		name: "Analytics", 
		icon: TrendingUp, 
		color: "#2d5016", 
		href: "http://127.0.0.1:8050/",
		external: true,
		adminOnly: true
	},
];

const Sidebar = () => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(true);
	const [user, setUser] = useState(null);
	const navigate = useNavigate();

	useEffect(() => {
		const currentUser = authService.getCurrentUser();
		setUser(currentUser);
	}, []);

	const handleLogout = () => {
		authService.logout();
		navigate('/Login');
	};

	const filteredItems = SIDEBAR_ITEMS.filter(item => {
		if (item.adminOnly && user?.role !== 'admin') return false;
		if (item.userOnly && user?.role === 'admin') return false;
		return true;
	});

	return (
		<motion.div
			className={`relative z-10 transition-all duration-300 ease-in-out flex-shrink-0 ${
				isSidebarOpen ? "w-64" : "w-20"
			}`}
			animate={{ width: isSidebarOpen ? 256 : 80 }}
		>
			<div className='h-full bg-white bg-opacity-90 backdrop-blur-md p-4 flex flex-col border-r border-primary-200 shadow-lg'>
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={() => setIsSidebarOpen(!isSidebarOpen)}
					className='p-2 rounded-full hover:bg-primary-100 transition-colors max-w-fit text-primary-700'
				>
					<Menu size={24} />
				</motion.button>

				{/* User info */}
				{isSidebarOpen && user && (
					<motion.div 
						className="mt-4 p-3 bg-primary-50 rounded-lg"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
					>
						<div className="flex items-center space-x-2">
							<div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
								<User size={16} className="text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-primary-800 truncate">
									{user.name}
								</p>
								<p className="text-xs text-primary-600 truncate">
									{user.department} • {user.role}
								</p>
							</div>
						</div>
					</motion.div>
				)}

				<nav className='mt-8 flex-grow'>
					{filteredItems.map((item) => (
						item.external ? (
							<a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
								<motion.div className='flex items-center p-4 text-sm font-medium rounded-lg hover:bg-primary-50 transition-colors mb-2 text-secondary-800'>
									<item.icon size={20} style={{ color: item.color, minWidth: "20px" }} />
									<AnimatePresence>
										{isSidebarOpen && (
											<motion.span
												className='ml-4 whitespace-nowrap'
												initial={{ opacity: 0, width: 0 }}
												animate={{ opacity: 1, width: "auto" }}
												exit={{ opacity: 0, width: 0 }}
												transition={{ duration: 0.2, delay: 0.3 }}
											>
												{item.name}
											</motion.span>
										)}
									</AnimatePresence>
								</motion.div>
							</a>
						) : (
							<Link key={item.href} to={item.href}>
								<motion.div className='flex items-center p-4 text-sm font-medium rounded-lg hover:bg-primary-50 transition-colors mb-2 text-secondary-800'>
									<item.icon size={20} style={{ color: item.color, minWidth: "20px" }} />
									<AnimatePresence>
										{isSidebarOpen && (
											<motion.span
												className='ml-4 whitespace-nowrap'
												initial={{ opacity: 0, width: 0 }}
												animate={{ opacity: 1, width: "auto" }}
												exit={{ opacity: 0, width: 0 }}
												transition={{ duration: 0.2, delay: 0.3 }}
											>
												{item.name}
											</motion.span>
										)}
									</AnimatePresence>
								</motion.div>
							</Link>
						)
					))}
				</nav>

				{/* Logout button */}
				<motion.button
					onClick={handleLogout}
					className='flex items-center p-4 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors mb-2 text-red-600 w-full'
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
				>
					<LogOut size={20} style={{ color: "#dc2626", minWidth: "20px" }} />
					<AnimatePresence>
						{isSidebarOpen && (
							<motion.span
								className='ml-4 whitespace-nowrap'
								initial={{ opacity: 0, width: 0 }}
								animate={{ opacity: 1, width: "auto" }}
								exit={{ opacity: 0, width: 0 }}
								transition={{ duration: 0.2, delay: 0.3 }}
							>
								Logout
							</motion.span>
						)}
					</AnimatePresence>
				</motion.button>
			</div>
		</motion.div>
	);
};
export default Sidebar;
