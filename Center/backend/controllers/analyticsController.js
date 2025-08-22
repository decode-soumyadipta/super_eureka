import { executeQuery } from '../config/database.js';

// Get overview analytics data
export const getOverviewAnalytics = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateCondition = '';
        let queryParams = [];

        if (start_date && end_date) {
            dateCondition = 'WHERE DATE(created_at) BETWEEN ? AND ?';
            queryParams = [start_date, end_date];
        }

        // Get total revenue
        const revenueResult = await executeQuery(`
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as total_sales
            FROM sales 
            ${dateCondition}
        `, queryParams);

        // Get total orders
        const ordersResult = await executeQuery(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
            FROM orders 
            ${dateCondition}
        `, queryParams);

        // Get total users/customers
        const usersResult = await executeQuery(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN role = 'customer' THEN 1 END) as total_customers,
                COUNT(CASE WHEN role = 'technician' THEN 1 END) as total_technicians
            FROM users 
            WHERE is_active = TRUE ${dateCondition ? 'AND ' + dateCondition.replace('WHERE ', '') : ''}
        `, queryParams);

        // Get page views (simulated data for now)
        const pageViewsResult = await executeQuery(`
            SELECT 
                COUNT(*) * 50 as page_views
            FROM orders 
            ${dateCondition}
        `, queryParams);

        const overviewData = {
            revenue: revenueResult.success ? revenueResult.data[0] : { total_revenue: 0, total_sales: 0 },
            orders: ordersResult.success ? ordersResult.data[0] : { total_orders: 0, completed_orders: 0, pending_orders: 0 },
            users: usersResult.success ? usersResult.data[0] : { total_users: 0, total_customers: 0, total_technicians: 0 },
            page_views: pageViewsResult.success ? pageViewsResult.data[0].page_views : 0
        };

        res.json({
            success: true,
            data: overviewData
        });

    } catch (error) {
        console.error('Get overview analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch overview analytics'
        });
    }
};

// Get revenue analytics
export const getRevenueAnalytics = async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        
        let groupBy, dateFormat;
        switch (period) {
            case 'daily':
                groupBy = 'DATE(sale_date)';
                dateFormat = '%Y-%m-%d';
                break;
            case 'weekly':
                groupBy = 'YEARWEEK(sale_date)';
                dateFormat = '%Y-W%u';
                break;
            case 'yearly':
                groupBy = 'YEAR(sale_date)';
                dateFormat = '%Y';
                break;
            default: // monthly
                groupBy = 'DATE_FORMAT(sale_date, "%Y-%m")';
                dateFormat = '%Y-%m';
        }

        const revenueQuery = `
            SELECT 
                ${groupBy} as period,
                SUM(total_amount) as revenue,
                COUNT(*) as sales_count,
                AVG(total_amount) as avg_order_value
            FROM sales 
            WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY ${groupBy}
            ORDER BY period DESC
            LIMIT 12
        `;

        const revenueResult = await executeQuery(revenueQuery);

        res.json({
            success: true,
            data: {
                revenue_data: revenueResult.success ? revenueResult.data : []
            }
        });

    } catch (error) {
        console.error('Get revenue analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue analytics'
        });
    }
};

// Get channel performance data
export const getChannelPerformance = async (req, res) => {
    try {
        // Simulated channel data since we don't have actual traffic source tracking
        const channelData = [
            { name: 'Walk-in Customers', value: 4000, percentage: 35 },
            { name: 'Phone Inquiries', value: 3000, percentage: 26 },
            { name: 'Online Bookings', value: 2500, percentage: 22 },
            { name: 'Referrals', value: 1500, percentage: 13 },
            { name: 'Social Media', value: 500, percentage: 4 }
        ];

        res.json({
            success: true,
            data: { channels: channelData }
        });

    } catch (error) {
        console.error('Get channel performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch channel performance'
        });
    }
};

// Get customer segmentation data
export const getCustomerSegmentation = async (req, res) => {
    try {
        const segmentationQuery = `
            SELECT 
                CASE 
                    WHEN order_count >= 10 THEN 'VIP Customers'
                    WHEN order_count >= 5 THEN 'Regular Customers'
                    WHEN order_count >= 2 THEN 'Returning Customers'
                    ELSE 'New Customers'
                END as segment,
                COUNT(*) as customer_count,
                AVG(total_spent) as avg_spending
            FROM (
                SELECT 
                    c.id,
                    COUNT(o.id) as order_count,
                    COALESCE(SUM(s.total_amount), 0) as total_spent
                FROM customers c
                LEFT JOIN orders o ON c.id = o.customer_id
                LEFT JOIN sales s ON o.id = s.order_id
                GROUP BY c.id
            ) customer_stats
            GROUP BY segment
            ORDER BY avg_spending DESC
        `;

        const segmentationResult = await executeQuery(segmentationQuery);

        res.json({
            success: true,
            data: {
                segments: segmentationResult.success ? segmentationResult.data : []
            }
        });

    } catch (error) {
        console.error('Get customer segmentation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer segmentation'
        });
    }
};

// Get user retention data
export const getUserRetention = async (req, res) => {
    try {
        const retentionQuery = `
            SELECT 
                DATE_FORMAT(first_order.created_at, '%Y-%m') as cohort_month,
                TIMESTAMPDIFF(MONTH, first_order.created_at, repeat_orders.created_at) as period_number,
                COUNT(DISTINCT repeat_orders.customer_id) as retained_customers
            FROM (
                SELECT customer_id, MIN(created_at) as created_at
                FROM orders
                GROUP BY customer_id
            ) first_order
            LEFT JOIN orders repeat_orders ON first_order.customer_id = repeat_orders.customer_id
            WHERE repeat_orders.created_at >= first_order.created_at
            AND first_order.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY cohort_month, period_number
            ORDER BY cohort_month, period_number
        `;

        const retentionResult = await executeQuery(retentionQuery);

        res.json({
            success: true,
            data: {
                retention_data: retentionResult.success ? retentionResult.data : []
            }
        });

    } catch (error) {
        console.error('Get user retention error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user retention data'
        });
    }
};

// Get AI-powered insights
export const getAIPoweredInsights = async (req, res) => {
    try {
        // Get recent statistics to generate insights
        const revenueResult = await executeQuery(`
            SELECT 
                SUM(CASE WHEN MONTH(sale_date) = MONTH(CURDATE()) THEN total_amount ELSE 0 END) as current_month_revenue,
                SUM(CASE WHEN MONTH(sale_date) = MONTH(CURDATE()) - 1 THEN total_amount ELSE 0 END) as last_month_revenue
            FROM sales 
            WHERE YEAR(sale_date) = YEAR(CURDATE())
        `);

        const ordersResult = await executeQuery(`
            SELECT 
                COUNT(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) THEN 1 END) as current_month_orders,
                COUNT(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) - 1 THEN 1 END) as last_month_orders
            FROM orders 
            WHERE YEAR(created_at) = YEAR(CURDATE())
        `);

        const topServiceResult = await executeQuery(`
            SELECT 
                p.name,
                p.service_type,
                COUNT(oi.id) as service_count
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'completed'
            AND DATE(o.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY p.id, p.name, p.service_type
            ORDER BY service_count DESC
            LIMIT 1
        `);

        // Generate insights based on data
        const insights = [];

        if (revenueResult.success && revenueResult.data.length > 0) {
            const { current_month_revenue, last_month_revenue } = revenueResult.data[0];
            if (current_month_revenue > last_month_revenue) {
                const growth = ((current_month_revenue - last_month_revenue) / last_month_revenue * 100).toFixed(1);
                insights.push({
                    icon: 'TrendingUp',
                    color: 'text-green-500',
                    insight: `Revenue is up ${growth}% compared to last month, showing strong business growth.`
                });
            }
        }

        if (ordersResult.success && ordersResult.data.length > 0) {
            const { current_month_orders, last_month_orders } = ordersResult.data[0];
            if (current_month_orders > last_month_orders) {
                insights.push({
                    icon: 'Users',
                    color: 'text-blue-500',
                    insight: `Customer engagement has improved with ${current_month_orders} orders this month vs ${last_month_orders} last month.`
                });
            }
        }

        if (topServiceResult.success && topServiceResult.data.length > 0) {
            const topService = topServiceResult.data[0];
            insights.push({
                icon: 'ShoppingBag',
                color: 'text-purple-500',
                insight: `"${topService.name}" is your most popular service this month with ${topService.service_count} requests.`
            });
        }

        insights.push({
            icon: 'DollarSign',
            color: 'text-yellow-500',
            insight: 'Consider implementing a loyalty program to increase customer retention and lifetime value.'
        });

        res.json({
            success: true,
            data: { insights }
        });

    } catch (error) {
        console.error('Get AI insights error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate insights'
        });
    }
};

// Save analytics data point
export const saveAnalyticsData = async (req, res) => {
    try {
        const { metric_name, metric_value, metric_data, repair_center_id } = req.body;

        if (!metric_name) {
            return res.status(400).json({
                success: false,
                message: 'Metric name is required'
            });
        }

        const result = await executeQuery(`
            INSERT INTO analytics_data (metric_name, metric_value, metric_data, date_recorded, repair_center_id)
            VALUES (?, ?, ?, CURDATE(), ?)
        `, [metric_name, metric_value, JSON.stringify(metric_data), repair_center_id]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save analytics data'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Analytics data saved successfully'
        });

    } catch (error) {
        console.error('Save analytics data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save analytics data'
        });
    }
};