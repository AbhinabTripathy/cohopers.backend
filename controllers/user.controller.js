const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {User} = require ('../models');
const adminController = require('./admin.controller');
const httpStatus = require("../enums/httpStatusCode.enum");
const responseMessages = require("../enums/responseMessages.enum");

const userController = {};
// User Registration
userController.register = async (req, res) => {
    try {
        const { userName, email, mobile, password, confirmPassword } = req.body;

        // Validate required fields
        if (!userName || !email || !mobile || !password || !confirmPassword) {
            return res.error(
                httpStatus.BAD_REQUEST,
                false,
                "All fields are required"
            );
        }

        // Validate password match
        if (password !== confirmPassword) {
            return res.error(
                httpStatus.BAD_REQUEST,
                false,
                "Passwords do not match"
            );
        }

        // Check if user with email or mobile already exists
        const existingUser = await User.findOne({
            where: { email } // you can add `OR` mobile check here if needed
        });

        if (existingUser) {
            return res.error(
                httpStatus.CONFLICT,
                false,
                "User with this email already exists"
            );
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await User.create({
            username:userName,
            email,
            mobile,
            password: hashedPassword
        });

        // Remove password from response
        const userResponse = newUser.toJSON();
        delete userResponse.password;

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: newUser.id, 
                name: newUser.name,
                role: 'user' 
            },
            process.env.APP_SUPER_SECRET_KEY,
            { expiresIn: '24h' }
        );

        return res.success(
            httpStatus.CREATED,
            true,
            responseMessages.SAVE,
            {
                user: userResponse,
                token
            }
        );

    } catch (error) {
        console.error('User registration error:', error);
        return res.error(
            httpStatus.INTERNAL_SERVER_ERROR,
            false,
            "Error registering user",
            error
        );
    }
};
// User login
userController.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Validate input
    if (!mobile || !password) {
      return res.error(
        httpStatus.BAD_REQUEST,
        false,
        "Mobile number and password are required"
      );
    }

    // Find user by mobile number
    const user = await User.findOne({
      where: { mobile }
    });

    if (!user) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Invalid mobile number or password"
      );
    }

    // Compare password hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.error(
        httpStatus.UNAUTHORIZED,
        false,
        "Invalid mobile number or password"
      );
    }

    // Remove password from response object
    const userResponse = user.toJSON();
    delete userResponse.password;

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        role: 'user'
      },
      process.env.APP_SUPER_SECRET_KEY,
      { expiresIn: '24h' }
    );

    return res.success(
      httpStatus.OK,
      true,
      "Login successful",
      {
        user: userResponse,
        token
      }
    );

  } catch (error) {
    console.error("User login error:", error);
    return res.error(
      httpStatus.INTERNAL_SERVER_ERROR,
      false,
      "Error during login",
      error
    );
  }
};

module.exports = userController;