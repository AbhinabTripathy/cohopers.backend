const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ADMIN_CREDENTIALS = {
    email: 'info@cohopers.in',
    // Store hashed password in production
    password: 'Cohopers@123'
};

const adminController={}; 
  adminController.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email !== ADMIN_CREDENTIALS.email || password !== ADMIN_CREDENTIALS.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { email: ADMIN_CREDENTIALS.email, role: 'admin' },
            process.env.APP_SUPER_SECRET_KEY,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { token }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
};

module.exports = adminController;