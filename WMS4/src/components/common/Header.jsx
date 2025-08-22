const Header = ({ title }) => {
	return (
		<header className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg border-b border-primary-200'>
			<div className='max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center'>
				{/* Image placeholder for logo on the left */}
				<img
					src='/path/to/logo.png' // Update this path later
					alt='Logo'
					style={{ width: '40px', height: '40px', objectFit: 'contain', marginRight: '16px' }}
				/>
				<h1 className='text-2xl font-semibold text-primary-800'>{title}</h1>
			</div>
		</header>
	);
};
export default Header;
