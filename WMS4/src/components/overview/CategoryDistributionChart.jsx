import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const categoryData = [
	{ name: "Electronics", value: 4500 },
	{ name: "Clothing", value: 3200 },
	{ name: "Home & Garden", value: 2800 },
	{ name: "Books", value: 2100 },
	{ name: "Sports & Outdoors", value: 1900 },
];

const COLORS = ["#4caf50", "#45a049", "#388e3c", "#2d5016", "#75b575"];

const CategoryDistributionChart = () => {
	return (
		<motion.div
			className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			<h2 className='text-lg font-medium mb-4 text-primary-800'>Waste Distribution</h2>
			<div className='h-80'>
				<ResponsiveContainer width={"100%"} height={"100%"}>
					<PieChart>
						<Pie
							data={categoryData}
							cx={"50%"}
							cy={"50%"}
							labelLine={false}
							outerRadius={80}
							fill='#8884d8'
							dataKey='value'
							label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
						>
							{categoryData.map((entry, index) => (
								<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								backgroundColor: "rgba(255, 255, 255, 0.95)",
								borderColor: "#4caf50",
								color: "#2d5016"
							}}
							itemStyle={{ color: "#2d5016" }}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};
export default CategoryDistributionChart;
