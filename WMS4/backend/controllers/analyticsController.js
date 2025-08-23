import { executeQuery } from '../config/database.js';

// Get comprehensive dashboard analytics
const getDashboardAnalytics = async (req, res) => {
    try {
        const department = req.user.role === 'admin' ? req.query.department || req.user.department : req.user.department;
        const isAdmin = req.user.role === 'admin';

        console.log('📊 Analytics: Fetching dashboard data for', isAdmin ? 'admin' : `department: ${department}`);

        // Base queries for device analytics
        const deviceQueries = isAdmin ? {
            totalDevicesQuery: `SELECT COUNT(*) as total_devices FROM devices WHERE is_active = TRUE`,
            conditionStatsQuery: `SELECT condition_status, COUNT(*) as count FROM devices WHERE is_active = TRUE GROUP BY condition_status`,
            typeStatsQuery: `SELECT device_type, COUNT(*) as count FROM devices WHERE is_active = TRUE GROUP BY device_type ORDER BY count DESC LIMIT 10`,
            recentRegistrationsQuery: `SELECT COUNT(*) as recent_registrations FROM devices WHERE registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND is_active = TRUE`,
            monthlyTrendQuery: `SELECT DATE_FORMAT(registration_date, '%Y-%m') as month, COUNT(*) as count FROM devices WHERE is_active = TRUE AND registration_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(registration_date, '%Y-%m') ORDER BY month`,
            recentActivityQuery: `SELECT dal.*, d.device_name, d.device_type, u.name as performed_by_name, u.department as performed_by_department FROM device_activity_logs dal JOIN devices d ON dal.device_id = d.id JOIN users u ON dal.performed_by = u.id ORDER BY dal.performed_at DESC LIMIT 10`
        } : {
            totalDevicesQuery: `SELECT COUNT(*) as total_devices FROM devices WHERE current_department = ? AND is_active = TRUE`,
            conditionStatsQuery: `SELECT condition_status, COUNT(*) as count FROM devices WHERE current_department = ? AND is_active = TRUE GROUP BY condition_status`,
            typeStatsQuery: `SELECT device_type, COUNT(*) as count FROM devices WHERE current_department = ? AND is_active = TRUE GROUP BY device_type ORDER BY count DESC LIMIT 10`,
            recentRegistrationsQuery: `SELECT COUNT(*) as recent_registrations FROM devices WHERE current_department = ? AND registration_date >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND is_active = TRUE`,
            monthlyTrendQuery: `SELECT DATE_FORMAT(registration_date, '%Y-%m') as month, COUNT(*) as count FROM devices WHERE current_department = ? AND is_active = TRUE AND registration_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(registration_date, '%Y-%m') ORDER BY month`,
            recentActivityQuery: `SELECT dal.*, d.device_name, d.device_type, u.name as performed_by_name FROM device_activity_logs dal JOIN devices d ON dal.device_id = d.id JOIN users u ON dal.performed_by = u.id WHERE d.current_department = ? ORDER BY dal.performed_at DESC LIMIT 10`
        };

        const params = isAdmin ? [] : [department];

        // Execute all queries in parallel for better performance
        const [
            totalDevicesResult,
            conditionStatsResult,
            typeStatsResult,
            recentRegistrationsResult,
            monthlyTrendResult,
            recentActivityResult,
            disposalStatsResult,
            ipfsStatsResult,
            communityStatsResult,
            resourceExchangeStatsResult
        ] = await Promise.all([
            executeQuery(deviceQueries.totalDevicesQuery, params),
            executeQuery(deviceQueries.conditionStatsQuery, params),
            executeQuery(deviceQueries.typeStatsQuery, params),
            executeQuery(deviceQueries.recentRegistrationsQuery, params),
            executeQuery(deviceQueries.monthlyTrendQuery, params),
            executeQuery(deviceQueries.recentActivityQuery, params),
            
            // Disposal requests analytics
            executeQuery(isAdmin 
                ? `SELECT status, COUNT(*) as count FROM disposal_requests GROUP BY status`
                : `SELECT status, COUNT(*) as count FROM disposal_requests WHERE department = ? GROUP BY status`, 
                isAdmin ? [] : [department]
            ),
            
            // IPFS uploads analytics
            executeQuery(isAdmin 
                ? `SELECT DATE_FORMAT(upload_date, '%Y-%m') as month, COUNT(*) as count FROM ipfs_uploads WHERE status = 'uploaded' AND upload_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(upload_date, '%Y-%m') ORDER BY month`
                : `SELECT DATE_FORMAT(iu.upload_date, '%Y-%m') as month, COUNT(*) as count FROM ipfs_uploads iu JOIN users u ON iu.user_id = u.id WHERE iu.status = 'uploaded' AND u.department = ? AND iu.upload_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(iu.upload_date, '%Y-%m') ORDER BY month`,
                isAdmin ? [] : [department]
            ),
            
            // Community posts analytics
            executeQuery(isAdmin 
                ? `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count FROM community_posts WHERE is_active = TRUE AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month`
                : `SELECT DATE_FORMAT(cp.created_at, '%Y-%m') as month, COUNT(*) as count FROM community_posts cp JOIN users u ON cp.user_id = u.id WHERE cp.is_active = TRUE AND u.department = ? AND cp.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(cp.created_at, '%Y-%m') ORDER BY month`,
                isAdmin ? [] : [department]
            ),
            
            // Resource exchange analytics
            executeQuery(isAdmin 
                ? `SELECT status, COUNT(*) as count FROM resource_exchange_requests GROUP BY status`
                : `SELECT status, COUNT(*) as count FROM resource_exchange_requests WHERE requester_department = ? GROUP BY status`,
                isAdmin ? [] : [department]
            )
        ]);

        // Calculate additional insights
        const totalDevices = totalDevicesResult.success ? totalDevicesResult.data[0].total_devices : 0;
        const recentRegistrations = recentRegistrationsResult.success ? recentRegistrationsResult.data[0].recent_registrations : 0;
        
        // Calculate maintenance needed (poor + damaged condition)
        const conditionBreakdown = conditionStatsResult.success ? conditionStatsResult.data : [];
        const maintenanceNeeded = conditionBreakdown
            .filter(item => ['poor', 'damaged'].includes(item.condition_status))
            .reduce((sum, item) => sum + item.count, 0);

        // Calculate disposal efficiency
        const disposalStats = disposalStatsResult.success ? disposalStatsResult.data : [];
        const totalDisposalRequests = disposalStats.reduce((sum, item) => sum + item.count, 0);
        const completedDisposals = disposalStats.find(item => item.status === 'completed')?.count || 0;
        const disposalEfficiency = totalDisposalRequests > 0 ? ((completedDisposals / totalDisposalRequests) * 100).toFixed(1) : 0;

        // Prepare comprehensive analytics response
        const analytics = {
            overview: {
                total_devices: totalDevices,
                recent_registrations: recentRegistrations,
                maintenance_needed: maintenanceNeeded,
                disposal_efficiency: disposalEfficiency,
                total_disposal_requests: totalDisposalRequests,
                department: isAdmin ? 'All Departments' : department
            },
            condition_breakdown: conditionBreakdown,
            device_types: typeStatsResult.success ? typeStatsResult.data : [],
            monthly_trend: monthlyTrendResult.success ? monthlyTrendResult.data : [],
            recent_activity: recentActivityResult.success ? recentActivityResult.data.slice(0, 5) : [],
            disposal_analytics: {
                by_status: disposalStats,
                efficiency_rate: disposalEfficiency,
                total_requests: totalDisposalRequests
            },
            ipfs_analytics: {
                monthly_uploads: ipfsStatsResult.success ? ipfsStatsResult.data : [],
                total_uploads: ipfsStatsResult.success ? ipfsStatsResult.data.reduce((sum, item) => sum + item.count, 0) : 0
            },
            community_analytics: {
                monthly_posts: communityStatsResult.success ? communityStatsResult.data : [],
                total_posts: communityStatsResult.success ? communityStatsResult.data.reduce((sum, item) => sum + item.count, 0) : 0
            },
            resource_exchange_analytics: {
                by_status: resourceExchangeStatsResult.success ? resourceExchangeStatsResult.data : [],
                total_requests: resourceExchangeStatsResult.success ? resourceExchangeStatsResult.data.reduce((sum, item) => sum + item.count, 0) : 0
            }
        };

        console.log('✅ Analytics: Dashboard data compiled successfully');

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('❌ Analytics: Dashboard fetch error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch dashboard analytics'
        });
    }
};

// Get device utilization insights
const getDeviceUtilization = async (req, res) => {
    try {
        const department = req.user.role === 'admin' ? req.query.department || req.user.department : req.user.department;
        const isAdmin = req.user.role === 'admin';

        const baseCondition = isAdmin ? 'WHERE d.is_active = TRUE' : 'WHERE d.current_department = ? AND d.is_active = TRUE';
        const params = isAdmin ? [] : [department];

        // Device age distribution
        const ageDistributionResult = await executeQuery(`
            SELECT 
                CASE 
                    WHEN DATEDIFF(NOW(), d.registration_date) <= 30 THEN 'New (≤30 days)'
                    WHEN DATEDIFF(NOW(), d.registration_date) <= 90 THEN 'Recent (31-90 days)'
                    WHEN DATEDIFF(NOW(), d.registration_date) <= 365 THEN 'Mature (3-12 months)'
                    ELSE 'Legacy (>1 year)'
                END as age_category,
                COUNT(*) as count
            FROM devices d
            ${baseCondition}
            GROUP BY age_category
        `, params);

        // Activity frequency analysis
        const activityFrequencyResult = await executeQuery(`
            SELECT 
                d.device_id,
                d.device_name,
                d.device_type,
                COUNT(dal.id) as activity_count,
                MAX(dal.performed_at) as last_activity,
                DATEDIFF(NOW(), MAX(dal.performed_at)) as days_since_activity
            FROM devices d
            LEFT JOIN device_activity_logs dal ON d.id = dal.device_id
            ${baseCondition.replace('WHERE', 'WHERE')}
            GROUP BY d.id
            ORDER BY activity_count DESC
            LIMIT 20
        `, params);

        res.json({
            success: true,
            data: {
                age_distribution: ageDistributionResult.success ? ageDistributionResult.data : [],
                activity_frequency: activityFrequencyResult.success ? activityFrequencyResult.data : []
            }
        });

    } catch (error) {
        console.error('❌ Analytics: Device utilization error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch device utilization data'
        });
    }
};

// Get sustainability metrics
const getSustainabilityMetrics = async (req, res) => {
    try {
        const department = req.user.role === 'admin' ? req.query.department || req.user.department : req.user.department;
        const isAdmin = req.user.role === 'admin';

        const baseCondition = isAdmin ? '' : 'WHERE department = ?';
        const params = isAdmin ? [] : [department];

        // E-waste disposal metrics
        const disposalMetricsResult = await executeQuery(`
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_requests,
                SUM(COALESCE(weight_kg, 0)) as total_weight_kg,
                SUM(COALESCE(estimated_value, 0)) as total_estimated_value,
                AVG(COALESCE(weight_kg, 0)) as avg_weight_per_request
            FROM disposal_requests
            ${baseCondition}
        `, params);

        // Monthly disposal trend
        const monthlyDisposalResult = await executeQuery(`
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as requests,
                SUM(COALESCE(weight_kg, 0)) as total_weight,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM disposal_requests
            ${baseCondition}
            AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month
        `, params);

        // Resource exchange impact
        const exchangeImpactResult = await executeQuery(`
            SELECT 
                COUNT(*) as total_exchanges,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_exchanges
            FROM resource_exchange_requests
            ${baseCondition.replace('department', 'requester_department')}
        `, params);

        res.json({
            success: true,
            data: {
                disposal_metrics: disposalMetricsResult.success ? disposalMetricsResult.data[0] : {},
                monthly_disposal_trend: monthlyDisposalResult.success ? monthlyDisposalResult.data : [],
                exchange_impact: exchangeImpactResult.success ? exchangeImpactResult.data[0] : {}
            }
        });

    } catch (error) {
        console.error('❌ Analytics: Sustainability metrics error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch sustainability metrics'
        });
    }
};

export {
    getDashboardAnalytics,
    getDeviceUtilization,
    getSustainabilityMetrics
};