import { motion } from "framer-motion";
import { Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Sample data as fallback if API doesn't provide type data
const sampleData = [
  { name: 'Laptop', value: 24 },
  { name: 'Desktop', value: 18 },
  { name: 'Monitor', value: 12 },
  { name: 'Printer', value: 8 },
  { name: 'Keyboard', value: 5 },
];

// Colors for device type bars
const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#795548', '#009688'];

const SalesChannelChart = ({ deviceTypes = [] }) => {
  // Process device types from API or use sample data if none provided
  const chartData = deviceTypes && deviceTypes.length > 0
    ? deviceTypes.map(item => ({
        name: item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1),
        value: item.count
      }))
    : sampleData;

  return (
    <motion.div
      className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h2 className='text-lg font-medium mb-4 text-primary-800'>Device Type Distribution</h2>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#d1ebd1" />
            <XAxis 
              dataKey="name" 
              stroke='#757575'
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
            />
            <YAxis stroke='#757575' />
            <Tooltip
              formatter={(value) => [`${value} devices`, 'Count']}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: "#4caf50",
                color: "#2d5016"
              }}
              itemStyle={{ color: "#2d5016" }}
            />
            <Bar dataKey="value" fill="#4caf50" name="Number of Devices">
              {chartData.map((entry, index) => (
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
