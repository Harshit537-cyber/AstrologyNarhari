const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newPartner = new User({
            name,
            email,
            password: hashedPassword,
            role: 'partner'
        });
        await newPartner.save();
        res.status(201).json({ message: 'Partner registered successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const partner = await User.findOne({ email, role: 'partner' });
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }
        const isPasswordValid = await bcrypt.compare(password, partner.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign(
            { id: partner._id, role: partner.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '1d' }
        );
        res.status(200).json({
            token,
            partner: {
                id: partner._id,
                name: partner.name,
                email: partner.email,
                role: partner.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login };