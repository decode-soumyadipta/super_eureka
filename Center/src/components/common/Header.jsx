import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

const Header = ({ title }) => {
	const [user, setUser] = useState(null);

	useEffect(() => {
		const userData = localStorage.getItem('user');
		if (userData) {
			try {
				setUser(JSON.parse(userData));
			} catch (error) {
				console.error('Error parsing user data:', error);
			}
		}
	}, []);

	return (
		<header className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg border-b border-gray-700'>
			<div className='max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center'>
				<h1 className='text-2xl font-semibold text-gray-100'>{title}</h1>
				
				{user && (
					<div className='flex items-center space-x-3'>
						<div className='flex items-center space-x-2 bg-gray-700/50 rounded-lg px-3 py-2'>
							<User className='w-5 h-5 text-gray-400' />
							<div className='text-right'>
								<p className='text-sm font-medium text-gray-100'>{user.name}</p>
								<p className='text-xs text-gray-400 capitalize'>{user.role}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</header>
	);
};

export default Header;
