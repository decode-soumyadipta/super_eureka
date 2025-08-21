import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const salesData = [
	{ name: "Jan", sales: 1000 },
	{ name: "Feb", sales: 3800 },
	{ name: "Mar", sales: 5100 },
	{ name: "Apr", sales: 4600 },
	{ name: "May", sales: 5400 },
	{ name: "Jun", sales: 7200 },
	{ name: "Jul", sales: 6100 },
	{ name: "Aug", sales: 5900 },
	{ name: "Sep", sales: 6800 },
	{ name: "Nov", sales: 6300 },
	{ name: "Dec", sales: 7100 },
];

const SalesOverviewChart = () => {
	return (
		<motion.div
			className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
		>
			<h2 className='text-lg font-medium mb-4 text-primary-800'>Waste Overview</h2>

			<div className='h-80'>
				<ResponsiveContainer width={"100%"} height={"100%"}>
					<LineChart data={salesData}>
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
							dataKey='sales'
							stroke='#4caf50'
							strokeWidth={3}
							dot={{ fill: "#4caf50", strokeWidth: 2, r: 6 }}
							activeDot={{ r: 8, strokeWidth: 2 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};
export default SalesOverviewChart;
