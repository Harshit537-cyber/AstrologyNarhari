const Palm = require('../../models/palm/Palm');
const { getPalmId, getPalmReading } = require('../../services/palmistryService');
const fs = require('fs');
const path = require('path');

exports.uploadPalmAndScan = async (req, res) => {
    try {
        const userId = req.user.id; // token se aaya hua (auth middleware se)

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Palm image is required (field name: 'image')" });
        }

        const { hand } = req.body;
        if (!hand || !['left', 'right'].includes(hand.toLowerCase())) {
            // Invalid request hai to uploaded file cleanup kar do
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ success: false, message: "hand must be 'left' or 'right'" });
        }

        const normalizedHand = hand.toLowerCase();

        // Purani active scan isi hand ke liye deactivate karo
        await Palm.updateMany(
            { user: userId, hand: normalizedHand, isActive: true },
            { $set: { isActive: false } }
        );

        // Local disk path (multer diskStorage se milta hai)
        const imageUrl = req.file.path;

        // Pehle pending status ke saath record banao
        const palmRecord = await Palm.create({
            user: userId,
            imageUrl,
            hand: normalizedHand,
            palmId: null,
            status: 'pending'
        });

        // Disk se buffer padho aur Vision API ko bhejo
        const imageBuffer = fs.readFileSync(req.file.path);
        const result = await getPalmId(imageBuffer, req.file.mimetype, normalizedHand);

        if (!result.ok) {
            palmRecord.status = 'failed';
            palmRecord.failureReason = result.data?.message || result.message || 'Unknown error';
            await palmRecord.save();

            return res.status(502).json({
                success: false,
                message: "Palm scan failed",
                error: { status: result.status, data: result.data }
            });
        }

        // Response shape: { status: true, message: "success", data: { palm_id: "..." } }
        const palmId = result.data?.data?.palm_id;

        if (!palmId) {
            palmRecord.status = 'failed';
            palmRecord.failureReason = 'palm_id missing in API response';
            await palmRecord.save();
            return res.status(502).json({ success: false, message: "palm_id not returned by API", raw: result.data });
        }

        palmRecord.palmId = palmId;
        palmRecord.status = 'processed';
        await palmRecord.save();

        res.status(200).json({
            success: true,
            message: "Palm scanned successfully",
            palm: {
                id: palmRecord._id,
                hand: palmRecord.hand,
                palmId: palmRecord.palmId,
                imageUrl: palmRecord.imageUrl
            }
        });

    } catch (error) {
        console.error("uploadPalmAndScan Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getReading = async (req, res) => {
    try {
        const userId = req.user.id;
        const { category } = req.params; 
        const { hand } = req.query; 

        const validCategories = ['love', 'career', 'health', 'luck'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
        }

        const selectedHand = (hand || 'right').toLowerCase();

        const palmRecord = await Palm.findOne({ user: userId, hand: selectedHand, isActive: true, status: 'processed' });
        if (!palmRecord) {
            return res.status(404).json({ success: false, message: `No processed palm scan found for ${selectedHand} hand. Please scan your palm first.` });
        }

        const cached = palmRecord.readings[category];
        if (cached?.data) {
            return res.status(200).json({ success: true, cached: true, category, reading: cached.data });
        }

        const result = await getPalmReading(category, palmRecord.palmId);
        if (!result.ok) {
            return res.status(502).json({
                success: false,
                message: `Failed to fetch ${category} reading`,
                error: { status: result.status, data: result.data }
            });
        }

        palmRecord.readings[category] = { data: result.data, fetchedAt: new Date() };
        await palmRecord.save();

        res.status(200).json({ success: true, cached: false, category, reading: result.data });

    } catch (error) {
        console.error("getReading Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};