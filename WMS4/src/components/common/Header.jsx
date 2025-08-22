const Header = ({ title }) => {
	return (
		<header className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg border-b border-primary-200'>
			<div className='max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center'>
				{/* Logo and brand section */}
				<div className="flex items-center mr-4">
					<img
						src='/logo.png'
						alt='e-Shunya Logo'
						style={{ width: '32px', height: '32px', objectFit: 'contain', marginRight: '12px' }}
					/>
					<span style={{ 
						fontSize: '1.25rem', 
						fontWeight: '700', 
						color: '#2d5016',
						letterSpacing: '0.5px'
					}}>
						e-Shunya
					</span>
				</div>
				<h1 className='text-2xl font-semibold text-primary-800'>{title}</h1>
			</div>
		</header>
	);
};
export default Header;
