import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Colors for different disposal statuses
const DISPOSAL_COLORS = {
  pending: "#ff9800",
  approved: "#2196f3", 
  completed: "#4caf50",
  rejected: "#f44336",
  cancelled: "#9e9e9e",
  'pickup_scheduled': "#673ab7",
  'out_for_pickup': "#ff5722",
  'pickup_completed': "#8bc34a"
};

const DisposalAnalyticsChart = ({ disposalAnalytics = {} }) => {
  // Process disposal analytics data
  const chartData = disposalAnalytics.by_status && disposalAnalytics.by_status.length > 0
    ? disposalAnalytics.by_status.map(item => ({
        name: item.status.charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1),
        value: item.count,
        status: item.status
      }))
    : [{ name: "No Data", value: 1, status: "no_data" }];

  return (
    <motion.div
      className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className='text-lg font-medium text-primary-800'>E-Waste Disposal Requests</h2>
        <div className="text-sm text-secondary-600">
          Efficiency: {disposalAnalytics.efficiency_rate || 0}%
        </div>
      </div>
      
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
                  fill={DISPOSAL_COLORS[entry.status] || '#8884d8'} 
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} requests`, name]}
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
      
      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="bg-primary-50 p-3 rounded-lg">
          <p className="text-xs text-secondary-600">Total Requests</p>
          <p className="text-lg font-bold text-primary-800">{disposalAnalytics.total_requests || 0}</p>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <p className="text-xs text-secondary-600">Success Rate</p>
          <p className="text-lg font-bold text-green-700">{disposalAnalytics.efficiency_rate || 0}%</p>
        </div>
      </div>
    </motion.div>
  );
};

export default DisposalAnalyticsChart;