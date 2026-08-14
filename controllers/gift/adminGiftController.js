const Gift = require('../../models/Gift/Gift');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const User = require('../../models/User');
const Partner = require('../../models/Partner/Partner');
const mongoose = require('mongoose');
const LiveSession = require('../../models/Agora/LiveSession');
const GiftTransaction = require("../../models/Gift/GiftTransaction");

//ADMIN API  

exports.addGift = async (req, res) => {
    try {
        const { giftName, price } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a gift icon" });
        }
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'astrology_app/gifts',
            resource_type: 'image'
        });

        const newGift = await Gift.create({
            giftName,
            price: Number(price),
            iconUrl: result.secure_url
        });
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(201).json({
            success: true,
            message: "Gift added successfully",
            gift: newGift
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.editGift = async (req, res) => {
    try {
        const { id } = req.params;
        const { giftName, price, isActive } = req.body;

        let gift = await Gift.findById(id);
        if (!gift) {
            return res.status(404).json({ success: false, message: "Gift not found" });
        }

        let updatedData = {
            giftName: giftName || gift.giftName,
            price: price ? Number(price) : gift.price,
            isActive: isActive !== undefined ? isActive : gift.isActive
        };

        if (req.file) {

            if (gift.iconUrl) {
                const publicId = gift.iconUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`astrology_app/gifts/${publicId}`).catch(err => console.log("Old file delete failed", err));
            }

            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'astrology_app/gifts',
                resource_type: 'image'
            });

            updatedData.iconUrl = result.secure_url;

            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }

        const updatedGift = await Gift.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Gift updated successfully",
            gift: updatedGift
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getAllGiftsForAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalGifts = await Gift.countDocuments();

        const gifts = await Gift.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            pagination: {
                totalGifts,
                currentPage: page,
                totalPages: Math.ceil(totalGifts / limit),
                hasNextPage: page * limit < totalGifts,
                hasPrevPage: page > 1,
                limit
            },
            gifts
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getGiftById = async (req, res) => {
    try {
        const gift = await Gift.findById(req.params.id);
        if (!gift) {
            return res.status(404).json({ success: false, message: "Gift not found" });
        }
        res.status(200).json({ success: true, gift });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteGift = async (req, res) => {
    try {
        const gift = await Gift.findById(req.params.id);
        if (!gift) {
            return res.status(404).json({ success: false, message: "Gift not found" });
        }

        if (gift.iconUrl) {
            const urlParts = gift.iconUrl.split('/');
            const fileNameWithExtension = urlParts[urlParts.length - 1];
            const publicIdWithoutExtension = fileNameWithExtension.split('.')[0];

            const publicId = `astrology_app/gifts/${publicIdWithoutExtension}`;

            await cloudinary.uploader.destroy(publicId);
        }

        await Gift.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Gift and icon deleted successfully from DB and Cloudinary"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// USER API'S 

exports.getActiveGifts = async (req, res) => {
    try {
        const gifts = await Gift.find({ isActive: true }).sort({ price: 1 });
        res.status(200).json({ success: true, gifts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.sendGiftInLive = async (req, res) => {
    const userId = req.user._id || req.user.id;
    const { giftId, sessionId } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const gift = await Gift.findById(giftId).session(session);
        const liveSession = await LiveSession.findById(sessionId).session(session);
        const user = await User.findById(userId).session(session);

        if (!gift || !liveSession || !user) {
            return res.status(404).json({ success: false, message: "Required data not found" });
        }

        if (liveSession.status !== 'Active') {
            return res.status(400).json({ success: false, message: "Live stream is not active" });
        }

        if (user.walletBalance < gift.price) {
            return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
        }

        const partner = await Partner.findById(liveSession.partnerId).session(session);
        if (!partner) throw new Error("Partner not found");

        const uBalanceBefore = user.walletBalance;
        const pBalanceBefore = partner.walletBalance;

        const giftPrice = gift.price;
        const partnerGets = giftPrice;

        user.walletBalance -= giftPrice;
        partner.walletBalance += partnerGets;
        liveSession.totalEarnings += giftPrice;

        await user.save({ session });
        await partner.save({ session });
        await liveSession.save({ session });

        await GiftTransaction.create([{
            senderId: userId,
            receiverId: partner._id,
            sessionId: sessionId,
            giftId: giftId,
            amount: giftPrice,
            partnerEarning: partnerGets,
            userBalanceBefore: uBalanceBefore,
            userBalanceAfter: user.walletBalance,
            partnerBalanceBefore: pBalanceBefore,
            partnerBalanceAfter: partner.walletBalance
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: `You gifted ${gift.giftName} to ${partner.fullName}`,
            data: {
                giftName: gift.giftName,
                icon: gift.iconUrl,
                senderName: user.fullName || user.name,
                newWalletBalance: user.walletBalance
            }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getGiftDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const gift = await Gift.findOne({ _id: id, isActive: true });

        if (!gift) {
            return res.status(404).json({
                success: false,
                message: "Gift not found or it has been deactivated by admin"
            });
        }

        res.status(200).json({
            success: true,
            gift: {
                _id: gift._id,
                giftName: gift.giftName,
                price: gift.price,
                iconUrl: gift.iconUrl
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Invalid Gift ID or Server Error" });
    }
};

exports.getMyGiftHistory = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;

        const history = await GiftTransaction.find({ senderId: userId })
            .populate('receiverId', 'fullName profilePic') 
            .populate('giftId', 'giftName iconUrl price')   
            .sort({ createdAt: -1 });

        if (!history || history.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No gift history found",
                data: []
            });
        }

        const formattedHistory = history.map(item => ({
            transactionId: item._id,
            partnerName: item.receiverId ? item.receiverId.fullName : "Unknown Partner",
            partnerPic: item.receiverId ? item.receiverId.profilePic : null,
            giftName: item.giftId ? item.giftId.giftName : "Unknown Gift",
            giftIcon: item.giftId ? item.giftId.iconUrl : null,
            amountSpent: item.amount,
            date: item.createdAt,
            balanceBefore: item.userBalanceBefore,
            balanceAfter: item.userBalanceAfter
        }));

        res.status(200).json({
            success: true,
            count: formattedHistory.length,
            data: formattedHistory
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// PARTNER API

exports.getReceivedGifts = async (req, res) => {
    try {
        const partnerId = req.user._id || req.user.id; 

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const history = await GiftTransaction.find({ receiverId: partnerId })
            .populate('giftId', 'giftName iconUrl price')
            .populate('senderId', 'fullName profilePic name') 
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await GiftTransaction.countDocuments({ receiverId: partnerId });

        res.status(200).json({
            success: true,
            totalGifts: total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit)
            },
            history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSessionEarnings = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const partnerId = req.user._id || req.user.id;

        const transactions = await GiftTransaction.find({ 
            receiverId: partnerId, 
            sessionId: sessionId 
        }).populate('giftId', 'giftName iconUrl');

        const totalSessionEarning = transactions.reduce((acc, item) => acc + item.partnerEarning, 0);

        res.status(200).json({
            success: true,
            totalEarning: totalSessionEarning,
            totalGifts: transactions.length,
            transactions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPartnerGiftSummary = async (req, res) => {
    try {
        const partnerId = req.user._id || req.user.id;
        const partner = await Partner.findById(partnerId).select('walletBalance fullName');

        const totalGiftsCount = await GiftTransaction.countDocuments({ receiverId: partnerId });

        res.status(200).json({
            success: true,
            data: {
                partnerName: partner.fullName,
                currentWalletBalance: partner.walletBalance,
                totalGiftsReceived: totalGiftsCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};