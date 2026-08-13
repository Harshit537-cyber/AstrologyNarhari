const RestrictedKeyword = require('../../models/Restrictkeyword/RestrictedKeyword');

exports.addKeyword = async (req, res) => {
    try {
        const { keyword, action } = req.body;

        if (!keyword) {
            return res.status(400).json({ success: false, message: "Keyword is required" });
        }

        const newKeyword = new RestrictedKeyword({
            keyword,
            action: action || 'block' 
        });

        await newKeyword.save();
        res.status(201).json({ success: true, message: "Keyword restricted successfully", data: newKeyword });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ success: false, message: "This keyword is already in the list" });
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getKeywords = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search || "";
        const query = {
            keyword: { $regex: search, $options: 'i' } 
        };

        const [keywords, totalRecords] = await Promise.all([
            RestrictedKeyword.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            RestrictedKeyword.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({
            success: true,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            data: keywords
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateKeyword = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, isActive } = req.body;

        const updated = await RestrictedKeyword.findByIdAndUpdate(
            id, 
            { action, isActive }, 
            { new: true }
        );

        if (!updated) return res.status(404).json({ success: false, message: "Keyword not found" });

        res.status(200).json({ success: true, message: "Keyword updated", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteKeyword = async (req, res) => {
    try {
        await RestrictedKeyword.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Keyword removed from restrictions" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getKeywordsForChat = async (req, res) => {
    try {
        const keywords = await RestrictedKeyword.find({ isActive: true })
                                               .select('keyword action -_id'); 
        res.status(200).json({ success: true, data: keywords });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};