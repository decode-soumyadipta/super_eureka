import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

// Sample fallback data if API doesn't provide condition data
const sampleData = [
	{ name: "Excellent", value: 35 },
	{ name: "Good", value: 30 },
	{ name: "Fair", value: 20 },
	{ name: "Poor", value: 10 },
	{ name: "Damaged", value: 5 },
];

// Colors for different device conditions
const CONDITION_COLORS = {
	excellent: "#4caf50",
	good: "#2196f3",
	fair: "#ff9800",
	poor: "#f44336",
	damaged: "#d32f2f"
};

const CategoryDistributionChart = ({ conditionData = [] }) => {
	// Process condition data from API or use sample data if none provided
	const chartData = conditionData && conditionData.length > 0
		? conditionData.map(item => ({
			name: item.condition_status.charAt(0).toUpperCase() + item.condition_status.slice(1),
			value: item.count,
			condition: item.condition_status
		}))
		: sampleData;

	return (
		<motion.div
			className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200 h-full'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			<h2 className='text-lg font-medium mb-4 text-primary-800'>Device Condition Distribution</h2>
			<div className='h-80'>
				<ResponsiveContainer width={"100%"} height={"100%"}>
					<PieChart>
						<Pie
							data={chartData}
							cx={"50%"}
							cy={"50%"}
							labelLine={false}
							outerRadius={80}
							fill='#8884d8'
							dataKey='value'
							nameKey='name'
							label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
						>
							{chartData.map((entry, index) => (
								<Cell 
									key={`cell-${index}`} 
									fill={CONDITION_COLORS[entry.condition?.toLowerCase()] || 
										  CONDITION_COLORS[entry.name?.toLowerCase()] ||
										  `#${Math.floor(Math.random()*16777215).toString(16)}`} 
								/>
							))}
						</Pie>
						<Tooltip
							formatter={(value, name) => [`${value} devices`, name]}
							contentStyle={{
								backgroundColor: "rgba(255, 255, 255, 0.95)",
								borderColor: "#4caf50",
								color: "#2d5016"
							}}
							itemStyle={{ color: "#2d5016" }}
						/>
					</PieChart>
				</ResponsiveContainer>
			</div>
			
			{/* Legend */}
			<div className="mt-4 flex flex-wrap justify-center gap-4">
				{chartData.map((entry, index) => (
					<div key={`legend-${index}`} className="flex items-center">
						<div 
							className="w-3 h-3 mr-2" 
							style={{ 
								backgroundColor: CONDITION_COLORS[entry.condition?.toLowerCase()] || 
												CONDITION_COLORS[entry.name?.toLowerCase()] ||
												`#${Math.floor(Math.random()*16777215).toString(16)}`
							}}
						></div>
						<span className="text-sm">{entry.name}: {entry.value}</span>
					</div>
				))}
			</div>
		</motion.div>
	);
};
export default CategoryDistributionChart;
