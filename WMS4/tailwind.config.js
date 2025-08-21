/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: {
					50: '#f0f9f0',
					100: '#e8f5e8',
					200: '#d1ebd1',
					300: '#a7d4a7',
					400: '#75b575',
					500: '#4caf50', // Active green
					600: '#45a049',
					700: '#388e3c',
					800: '#2d5016',
					900: '#1b5e20',
				},
				secondary: {
					50: '#fafafa',
					100: '#f5f5f5',
					200: '#eeeeee',
					300: '#e0e0e0',
					400: '#bdbdbd',
					500: '#9e9e9e',
					600: '#757575',
					700: '#616161',
					800: '#424242',
					900: '#212121',
				}
			}
		},
	},
	plugins: [],
};
