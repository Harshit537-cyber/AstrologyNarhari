const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password, mobile, role } = req.body;

        if (!name || !email || !password || !mobile) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields (name, email, password, mobile) are required' 
            });
        }

        const existingUser = await User.findOne({ 
            $or: [{ email }, { mobile }] 
        });

        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or mobile already exists' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const allowedRoles = ['user', 'partner', 'admin'];
        const assignedRole = allowedRoles.includes(role?.toLowerCase()) 
            ? role.toLowerCase() 
            : 'user';

        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            mobile,
            role: assignedRole
        });

        await newUser.save();

        res.status(201).json({ 
            success: true,
            message: `${assignedRole.charAt(0).toUpperCase() + assignedRole.slice(1)} registered successfully`,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, role: 'user' });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );
        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login };