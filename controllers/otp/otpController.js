const User = require('../../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const HARDCODED_OTP = "123456";

exports.sendOTP = async (req, res) => {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({ success: false, message: "Mobile number is required" });
        }

        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(404).json({ success: false, message: "Account not found with this mobile number" });
        }

        user.otp = HARDCODED_OTP;
        await user.save();

        return res.status(200).json({
            success: true,
            message: `OTP sent successfully to ${mobile}`,
            otp: HARDCODED_OTP 
        });

    } catch (error) {
        console.error("Send OTP Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return res.status(400).json({ success: false, message: "Mobile number and OTP are required" });
        }

        const user = await User.findOne({ mobile });

        if (!user || user.otp !== otp) {
            return res.status(401).json({ success: false, message: "Invalid OTP or Mobile Number" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        user.otp = null;
        await user.save();

        const cookieOptions = {
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'Strict'
        };

        res.cookie('token', token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${user.name}`,
            token,
            user: {
                id: user._id,
                name: user.name,
                mobile: user.mobile,
                role: user.role 
            }
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};