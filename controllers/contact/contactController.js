const Contact = require('../../models/contact/Contact');
const User= require("../../models/User");

exports.submitMessage = async (req, res) => {
    try {
        const { fullName, email, message } = req.body;

        if (!fullName || !email || !message) {
            return res.status(400).json({ success: false, message: "Please fill all fields" });
        }

        const newMessage = await Contact.create({ fullName, email, message });

        res.status(201).json({
            success: true,
            message: "Message sent successfully!",
            data: newMessage
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
 exports.getAllMessages = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const adminUser = await User.findById(userId);

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: Only admins can view these messages" 
            });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalMessages = await Contact.countDocuments();
        const messages = await Contact.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            admin: {
                name: adminUser.name,
                email: adminUser.email
            },
            pagination: {
                totalMessages,
                totalPages: Math.ceil(totalMessages / limit),
                currentPage: page,
                limit
            },
            data: messages
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};


exports.getMessageById = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const adminUser = await User.findById(userId);

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: Only admins can view message details" 
            });
        }

        const messageId = req.params.id;
        const contactMessage = await Contact.findById(messageId);

        if (!contactMessage) {
            return res.status(404).json({ 
                success: false, 
                message: "Message not found" 
            });
        }

        res.status(200).json({
            success: true,
            data: contactMessage
        });

    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: "Invalid Message ID format" });
        }
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;
        const adminUser = await User.findById(userId);

        if (!adminUser || adminUser.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Access Denied: Only admins can delete messages" 
            });
        }

        const messageId = req.params.id;
        const deletedMessage = await Contact.findByIdAndDelete(messageId);

        if (!deletedMessage) {
            return res.status(404).json({ 
                success: false, 
                message: "Message not found or already deleted" 
            });
        }

        res.status(200).json({
            success: true,
            message: "Message has been deleted successfully",
            deletedId: messageId
        });

    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ success: false, message: "Invalid Message ID format" });
        }
        res.status(500).json({ 
            success: false, 
            message: "Server Error", 
            error: error.message 
        });
    }
};