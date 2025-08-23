import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CommunityIPFSChart = ({ communityAnalytics = {}, ipfsAnalytics = {} }) => {
  // Combine community and IPFS data by month
  const combineDataByMonth = () => {
    const communityData = communityAnalytics.monthly_posts || [];
    const ipfsData = ipfsAnalytics.monthly_uploads || [];
    
    // Create a map of all months
    const monthsMap = new Map();
    
    // Add community data
    communityData.forEach(item => {
      const monthName = new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthsMap.set(item.month, {
        month: monthName,
        community_posts: item.count,
        ipfs_uploads: 0
      });
    });
    
    // Add IPFS data
    ipfsData.forEach(item => {
      const monthName = new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthsMap.has(item.month)) {
        monthsMap.get(item.month).ipfs_uploads = item.count;
      } else {
        monthsMap.set(item.month, {
          month: monthName,
          community_posts: 0,
          ipfs_uploads: item.count
        });
      }
    });
    
    // Convert to array and sort
    return Array.from(monthsMap.values()).sort((a, b) => {
      const dateA = new Date(a.month + ' 01');
      const dateB = new Date(b.month + ' 01');
      return dateA - dateB;
    });
  };

  const chartData = combineDataByMonth();

  return (
    <motion.div
      className='bg-white bg-opacity-90 backdrop-blur-md shadow-lg rounded-xl p-6 border border-primary-200'
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className='text-lg font-medium text-primary-800'>Community & Document Activity</h2>
        <div className="text-sm text-secondary-600">
          Last 6 months
        </div>
      </div>
      
      <div className='h-80'>
        <ResponsiveContainer width={"100%"} height={"100%"}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray='3 3' stroke='#d1ebd1' />
            <XAxis 
              dataKey="month" 
              stroke='#757575'
              fontSize={12}
            />
            <YAxis stroke='#757575' fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderColor: "#4caf50",
                color: "#2d5016"
              }}
              itemStyle={{ color: "#2d5016" }}
            />
            <Legend />
            <Line
              type='monotone'
              dataKey='community_posts'
              stroke='#2196f3'
              strokeWidth={2}
              dot={{ fill: "#2196f3", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Community Posts"
            />
            <Line
              type='monotone'
              dataKey='ipfs_uploads'
              stroke='#ff9800'
              strokeWidth={2}
              dot={{ fill: "#ff9800", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="IPFS Uploads"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-xs text-secondary-600">Total Community Posts</p>
          <p className="text-lg font-bold text-blue-700">{communityAnalytics.total_posts || 0}</p>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <p className="text-xs text-secondary-600">Total IPFS Uploads</p>
          <p className="text-lg font-bold text-orange-700">{ipfsAnalytics.total_uploads || 0}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default CommunityIPFSChart;