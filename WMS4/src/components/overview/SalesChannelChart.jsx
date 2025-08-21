import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

const COLORS = ["#4caf50", "#45a049", "#388e3c", "#2d5016", "#75b575"];

const SALES_CHANNEL_DATA = [
	{ name: "Plastic", value: 45600 },
	{ name: "E-Waste", value: 38200 },
	{ name: "Bio-Hazadous", value: 29800 },
	{ name: "Bio-Waste ", value: 18700 },
];

const SalesChannelChart = () => {
	return (
		<motion.div
			className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 lg:col-span-2 border border-primary-200'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4 }}
		>
			<h2 className='text-lg font-medium mb-4 text-primary-800'>Waste by Channel</h2>

			<div className='h-80'>
				<ResponsiveContainer>
					<BarChart data={SALES_CHANNEL_DATA}>
						<CartesianGrid strokeDasharray='3 3' stroke='#d1ebd1' />
						<XAxis dataKey='name' stroke='#757575' />
						<YAxis stroke='#757575' />
						<Tooltip
							contentStyle={{
								backgroundColor: "rgba(255, 255, 255, 0.95)",
								borderColor: "#4caf50",
								color: "#2d5016"
							}}
							itemStyle={{ color: "#2d5016" }}
						/>
						<Legend />
						<Bar dataKey={"value"} fill='#8884d8'>
							{SALES_CHANNEL_DATA.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};
export default SalesChannelChart;
