import { body, validationResult } from 'express-validator';
import { executeQuery } from '../config/database.js';

// Validation rules for creating products
export const createProductValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Product name must be between 2 and 255 characters'),
    body('category')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Category is required'),
    body('price')
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Valid price is required'),
    body('service_type')
        .isIn(['repair', 'replacement', 'maintenance', 'consultation'])
        .withMessage('Invalid service type'),
    body('estimated_time_hours')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Estimated time must be a positive integer'),
];

// Validation rules for updating products
export const updateProductValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 255 })
        .withMessage('Product name must be between 2 and 255 characters'),
    body('price')
        .optional()
        .isDecimal({ decimal_digits: '0,2' })
        .withMessage('Valid price is required'),
    body('estimated_time_hours')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Estimated time must be a positive integer'),
];

// Create new product/service
export const createProduct = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const {
            name,
            category,
            description,
            price,
            cost,
            service_type,
            estimated_time_hours = 1,
            warranty_period_days = 30
        } = req.body;

        // Check if product with same name exists
        const existingProduct = await executeQuery(
            'SELECT id FROM products WHERE name = ? AND is_active = TRUE',
            [name]
        );

        if (existingProduct.success && existingProduct.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Product with this name already exists'
            });
        }

        // Create product
        const result = await executeQuery(`
            INSERT INTO products (
                name, category, description, price, cost, 
                service_type, estimated_time_hours, warranty_period_days
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            name, category, description, price, cost,
            service_type, estimated_time_hours, warranty_period_days
        ]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create product'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: {
                product: {
                    id: result.data.insertId,
                    name,
                    category,
                    price,
                    service_type
                }
            }
        });

    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
};

// Get all products
export const getProducts = async (req, res) => {
    try {
        const { 
            category, 
            service_type, 
            page = 1, 
            limit = 20,
            search,
            sort_by = 'name',
            sort_order = 'ASC'
        } = req.query;

        let whereConditions = ['is_active = TRUE'];
        let queryParams = [];

        // Category filter
        if (category) {
            whereConditions.push('category = ?');
            queryParams.push(category);
        }

        // Service type filter
        if (service_type) {
            whereConditions.push('service_type = ?');
            queryParams.push(service_type);
        }

        // Search filter
        if (search) {
            whereConditions.push('(name LIKE ? OR description LIKE ? OR category LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        // Validate sort parameters
        const validSortFields = ['name', 'price', 'category', 'service_type', 'created_at'];
        const validSortOrders = ['ASC', 'DESC'];
        
        const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
        const sortDirection = validSortOrders.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

        // Calculate offset
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM products
            WHERE ${whereConditions.join(' AND ')}
        `;
        
        const countResult = await executeQuery(countQuery, queryParams);
        const total = countResult.success ? countResult.data[0].total : 0;

        // Get products with sales data
        const productsQuery = `
            SELECT 
                p.*,
                COALESCE(sales_data.total_sales, 0) as total_sales,
                COALESCE(sales_data.sales_count, 0) as sales_count
            FROM products p
            LEFT JOIN (
                SELECT 
                    oi.product_id,
                    SUM(oi.total_price) as total_sales,
                    SUM(oi.quantity) as sales_count
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'completed'
                GROUP BY oi.product_id
            ) sales_data ON p.id = sales_data.product_id
            WHERE ${whereConditions.join(' AND ')}
            ORDER BY ${sortField} ${sortDirection}
            LIMIT ? OFFSET ?
        `;

        queryParams.push(parseInt(limit), offset);
        const productsResult = await executeQuery(productsQuery, queryParams);

        if (!productsResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch products'
            });
        }

        res.json({
            success: true,
            data: {
                products: productsResult.data,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: total,
                    total_pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
};

// Get single product by ID
export const getProductById = async (req, res) => {
    try {
        const { productId } = req.params;

        const productQuery = `
            SELECT 
                p.*,
                COALESCE(sales_data.total_sales, 0) as total_sales,
                COALESCE(sales_data.sales_count, 0) as sales_count,
                COALESCE(sales_data.avg_rating, 0) as avg_rating
            FROM products p
            LEFT JOIN (
                SELECT 
                    oi.product_id,
                    SUM(oi.total_price) as total_sales,
                    SUM(oi.quantity) as sales_count,
                    AVG(5.0) as avg_rating
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'completed'
                GROUP BY oi.product_id
            ) sales_data ON p.id = sales_data.product_id
            WHERE p.id = ? AND p.is_active = TRUE
        `;

        const productResult = await executeQuery(productQuery, [productId]);

        if (!productResult.success || productResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get recent orders for this product
        const recentOrdersQuery = `
            SELECT 
                o.order_number,
                o.status,
                o.created_at,
                u.name as customer_name
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE oi.product_id = ?
            ORDER BY o.created_at DESC
            LIMIT 10
        `;

        const recentOrdersResult = await executeQuery(recentOrdersQuery, [productId]);

        res.json({
            success: true,
            data: {
                product: productResult.data[0],
                recent_orders: recentOrdersResult.success ? recentOrdersResult.data : []
            }
        });

    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product'
        });
    }
};

// Update product
export const updateProduct = async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { productId } = req.params;
        const {
            name,
            category,
            description,
            price,
            cost,
            service_type,
            estimated_time_hours,
            warranty_period_days
        } = req.body;

        // Check if product exists
        const existingProduct = await executeQuery(
            'SELECT id FROM products WHERE id = ? AND is_active = TRUE',
            [productId]
        );

        if (!existingProduct.success || existingProduct.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Build update query
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }
        if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (price !== undefined) {
            updateFields.push('price = ?');
            updateValues.push(price);
        }
        if (cost !== undefined) {
            updateFields.push('cost = ?');
            updateValues.push(cost);
        }
        if (service_type !== undefined) {
            updateFields.push('service_type = ?');
            updateValues.push(service_type);
        }
        if (estimated_time_hours !== undefined) {
            updateFields.push('estimated_time_hours = ?');
            updateValues.push(estimated_time_hours);
        }
        if (warranty_period_days !== undefined) {
            updateFields.push('warranty_period_days = ?');
            updateValues.push(warranty_period_days);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(productId);

        // Update product
        const updateResult = await executeQuery(
            `UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update product'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
};

// Delete product (soft delete)
export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        // Check if product exists
        const existingProduct = await executeQuery(
            'SELECT id FROM products WHERE id = ? AND is_active = TRUE',
            [productId]
        );

        if (!existingProduct.success || existingProduct.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check if product is used in any orders
        const orderItemsResult = await executeQuery(
            'SELECT id FROM order_items WHERE product_id = ? LIMIT 1',
            [productId]
        );

        if (orderItemsResult.success && orderItemsResult.data.length > 0) {
            // Soft delete - mark as inactive
            await executeQuery(
                'UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [productId]
            );
        } else {
            // Hard delete if no orders reference it
            await executeQuery('DELETE FROM products WHERE id = ?', [productId]);
        }

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });

    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete product'
        });
    }
};

// Get product categories
export const getProductCategories = async (req, res) => {
    try {
        const categoriesResult = await executeQuery(`
            SELECT 
                category,
                COUNT(*) as product_count,
                AVG(price) as avg_price
            FROM products 
            WHERE is_active = TRUE 
            GROUP BY category 
            ORDER BY category ASC
        `);

        if (!categoriesResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch categories'
            });
        }

        res.json({
            success: true,
            data: { categories: categoriesResult.data }
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories'
        });
    }
};

// Get product statistics
export const getProductStats = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateCondition = '';
        let queryParams = [];

        if (start_date && end_date) {
            dateCondition = 'AND DATE(o.created_at) BETWEEN ? AND ?';
            queryParams = [start_date, end_date];
        }

        // Get service type distribution
        const serviceStatsResult = await executeQuery(`
            SELECT 
                p.service_type,
                COUNT(DISTINCT p.id) as product_count,
                COALESCE(SUM(oi.quantity), 0) as total_sales,
                COALESCE(SUM(oi.total_price), 0) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
            WHERE p.is_active = TRUE ${dateCondition}
            GROUP BY p.service_type
        `, queryParams);

        // Get top selling products
        const topProductsResult = await executeQuery(`
            SELECT 
                p.name,
                p.category,
                p.price,
                SUM(oi.quantity) as total_sold,
                SUM(oi.total_price) as total_revenue
            FROM products p
            JOIN order_items oi ON p.id = oi.product_id
            JOIN orders o ON oi.order_id = o.id
            WHERE o.status = 'completed' AND p.is_active = TRUE ${dateCondition}
            GROUP BY p.id, p.name, p.category, p.price
            ORDER BY total_sold DESC
            LIMIT 10
        `, queryParams);

        // Get category performance
        const categoryStatsResult = await executeQuery(`
            SELECT 
                p.category,
                COUNT(DISTINCT p.id) as product_count,
                AVG(p.price) as avg_price,
                COALESCE(SUM(oi.quantity), 0) as total_sales,
                COALESCE(SUM(oi.total_price), 0) as total_revenue
            FROM products p
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.status = 'completed'
            WHERE p.is_active = TRUE ${dateCondition}
            GROUP BY p.category
            ORDER BY total_revenue DESC
        `, queryParams);

        res.json({
            success: true,
            data: {
                service_type_stats: serviceStatsResult.success ? serviceStatsResult.data : [],
                top_products: topProductsResult.success ? topProductsResult.data : [],
                category_stats: categoryStatsResult.success ? categoryStatsResult.data : []
            }
        });

    } catch (error) {
        console.error('Get product stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch product statistics'
        });
    }
};