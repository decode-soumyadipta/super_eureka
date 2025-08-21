import { motion } from "framer-motion";
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// Sample data - Will be replaced by real data from props
const sampleData = [
	{ name: "Jan", sales: 450 },
	{ name: "Feb", sales: 500 },
	{ name: "Mar", sales: 650 },
	{ name: "Apr", sales: 700 },
	{ name: "May", sales: 690 },
	{ name: "Jun", sales: 800 },
];

const SalesOverviewChart = ({ monthlyTrend = [] }) => {
	// Process monthly trend data from API or use sample data if none provided
	const chartData = monthlyTrend && monthlyTrend.length > 0
		? monthlyTrend.map(item => ({
			name: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
			devices: item.count
		}))
		: sampleData;

	return (
		<motion.div
			className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200 h-full'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
		>
			<h2 className='text-lg font-medium mb-4 text-primary-800'>Device Registration Trend</h2>

			<div className='h-80'>
				<ResponsiveContainer width={"100%"} height={"100%"}>
					<LineChart data={chartData}>
						<CartesianGrid strokeDasharray='3 3' stroke='#d1ebd1' />
						<XAxis dataKey={"name"} stroke='#757575' />
						<YAxis stroke='#757575' />
						<Tooltip
							contentStyle={{
								backgroundColor: "rgba(255, 255, 255, 0.95)",
								borderColor: "#4caf50",
								color: "#2d5016"
							}}
							itemStyle={{ color: "#2d5016" }}
						/>
						<Line
							type='monotone'
							dataKey='devices'
							stroke='#4caf50'
							activeDot={{ r: 8 }}
							name="Device Registrations"
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};
export default SalesOverviewChart;
