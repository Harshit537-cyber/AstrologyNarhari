const Card = require("../../models/Banner/Card");

// Add Card
exports.addCard = async (req, res) => {
    try {
        const { title, value } = req.body;

        const card = await Card.create({
            title,
            value,
        });

        return res.status(201).json({
            success: true,
            message: "Card created successfully.",
            data: card,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// Get All Cards
exports.getAllCards = async (req, res) => {
    try {
        const cards = await Card.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: cards,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// Get Card By ID
exports.getCardById = async (req, res) => {
    try {
        const { id } = req.params;

        const card = await Card.findById(id);

        if (!card) {
            return res.status(404).json({
                success: false,
                message: "Card not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: card,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// Update Card
exports.updateCard = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, value } = req.body;

        const card = await Card.findByIdAndUpdate(
            id,
            {
                title,
                value,
            },
            {
                new: true,
                runValidators: true,
            }
        );

        if (!card) {
            return res.status(404).json({
                success: false,
                message: "Card not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Card updated successfully.",
            data: card,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};

// Delete Card
exports.deleteCard = async (req, res) => {
    try {
        const { id } = req.params;

        const card = await Card.findByIdAndDelete(id);

        if (!card) {
            return res.status(404).json({
                success: false,
                message: "Card not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Card deleted successfully.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong.",
        });
    }
};