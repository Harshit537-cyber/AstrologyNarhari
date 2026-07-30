const Razorpay = require('razorpay');
const dotenv = require('dotenv');

dotenv.config();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("❌ Razorpay Key ID or Secret is missing in .env file");
}

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log("💳 Razorpay Instance Initialized Successfully!");

module.exports = razorpayInstance;