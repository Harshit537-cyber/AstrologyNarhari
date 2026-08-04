const Ticket = require('../../models/Ticket/Ticket');

exports.createTicket = async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;

        const userId = req.user?._id || req.user?.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication failed'
            });
        }

        const userRole = req.user?.role?.toLowerCase();
        const raisedByModel = userRole === 'partner' ? 'Partner' : 'User';

        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(file => file.path);
        }

        const newTicket = new Ticket({
            raisedBy: userId,
            raisedByModel,
            subject,
            description,
            category,
            priority,
            attachments
        });

        await newTicket.save();

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully',
            ticket: newTicket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getMyTickets = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        const tickets = await Ticket.find({ raisedBy: userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tickets.length,
            tickets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findById(id).populate('raisedBy', 'fullName name mobile email profilePic');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        const userId = req.user?._id || req.user?.id;
        if (req.user.role !== 'admin' && ticket.raisedBy._id.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized access'
            });
        }

        res.status(200).json({
            success: true,
            ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAllTicketsAdmin = async (req, res) => {
    try {
        const { status, category, priority, userType } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;
        if (userType) filter.raisedByModel = userType;

        const tickets = await Ticket.find(filter)
            .populate('raisedBy', 'fullName name mobile email profilePic')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tickets.length,
            tickets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateTicketStatusAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminResponse } = req.body;

        const ticket = await Ticket.findById(id);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Ticket not found'
            });
        }

        if (status) ticket.status = status;
        if (adminResponse !== undefined) ticket.adminResponse = adminResponse;

        if (status === 'Resolved' || status === 'Closed') {
            ticket.resolvedAt = new Date();
        }

        await ticket.save();

        res.status(200).json({
            success: true,
            message: 'Ticket updated successfully',
            ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};