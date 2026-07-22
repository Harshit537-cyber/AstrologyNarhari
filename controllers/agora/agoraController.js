const LiveSession = require('../../models/Agora/LiveSession');
const Partner = require('../../models/Partner/Partner');
const { generateAgoraTokens } = require('../../services/agoraService');
const User = require("../../models/User")

exports.startLive = async (req, res) => {
    try {
        const { partnerId, topic, category } = req.body; 

        const partner = await Partner.findById(partnerId);
        if (!partner || partner.profileApprovalStatus !== 'Approved') {
            return res.status(403).json({ message: "Partner not approved for live" });
        }

        const channelName = `channel_${partnerId}`;
        const uid = Math.floor(Math.random() * 1000000); 

        const { rtcToken, rtmToken } = generateAgoraTokens(channelName, uid);

        const session = await LiveSession.findOneAndUpdate(
            { partnerId },
            { channelName, topic, category, startTime: Date.now(), status: 'Active' },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await Partner.findByIdAndUpdate(partnerId, { isBusy: true, isOnline: true });

        res.status(200).json({
            success: true,
            data: { session, rtcToken, rtmToken, uid, channelName }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.joinLive = async (req, res) => {
    try {
        const { sessionId, userId } = req.body;
        const session = await LiveSession.findById(sessionId).select('channelName status');

        if (!session || session.status !== 'Active') {
            return res.status(404).json({ success: false, message: "Session is not active" });
        }

        const uid = parseInt(userId.toString().substring(userId.toString().length - 6), 16) % 1000000;

        const { rtcToken, rtmToken } = generateAgoraTokens(session.channelName, uid);

        await LiveSession.findByIdAndUpdate(sessionId, { $inc: { viewerCount: 1 } });

        res.status(200).json({
            success: true,
            data: {
                rtcToken, 
                rtmToken, 
                uid,      
                channelName: session.channelName
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.getActiveSessions = async (req, res) => {
    try {
        const { category } = req.query; 
        let query = { status: 'Active' };
        if (category) query.category = category;

        const sessions = await LiveSession.find(query)
            .populate('partnerId', 'fullName profilePic specialties averageRating');
            
        res.status(200).json({ success: true, sessions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.endLive = async (req, res) => {
    try {
        const { partnerId } = req.body;
        
        await LiveSession.findOneAndUpdate(
            { partnerId, status: 'Active' },
            { status: 'Ended', endTime: Date.now() }
        );

        await Partner.findByIdAndUpdate(partnerId, { isBusy: false, isOnline: false });

        res.status(200).json({ success: true, message: "Live ended successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.likeSession = async (req, res) => {
    try {
        const { sessionId, userId } = req.body;
        const { action } = req.query; 

        if (!userId || !sessionId) {
            return res.status(400).json({ success: false, message: "Details is Incompleted!" });
        }

        const user = await User.findById(userId).select('fullName');
        const nameOfLiker = user ? user.fullName : "Someone";

        if (action === 'like') {
            const updatedSession = await LiveSession.findOneAndUpdate(
                { 
                    _id: sessionId, 
                    likedByUsers: { $ne: userId } 
                },
                { 
                    $inc: { likeCount: 1 },         
                    $addToSet: { likedByUsers: userId } 
                },
                { new: true } 
            );

            if (!updatedSession) {
                const currentSession = await LiveSession.findById(sessionId).select('likeCount');
                return res.status(200).json({ 
                    success: true, 
                    message: "Count does not increased, You have already liked!",
                    totalLikes: currentSession.likeCount,
                    likedBy: nameOfLiker,
                    isNewLike: false 
                });
            }

            return res.status(200).json({ 
                success: true, 
                message: "Congratulation! First Like Count.",
                totalLikes: updatedSession.likeCount, 
                likedBy: nameOfLiker,
                isNewLike: true
            });
        }

        if (action === 'unlike') {
            const updatedSession = await LiveSession.findOneAndUpdate(
                { 
                    _id: sessionId, 
                    likedByUsers: userId 
                },
                { 
                    $inc: { likeCount: -1 },         
                    $pull: { likedByUsers: userId } 
                },
                { new: true } 
            );

            if (!updatedSession) {
                const currentSession = await LiveSession.findById(sessionId).select('likeCount');
                return res.status(200).json({ 
                    success: true, 
                    message: "You dost not liked so You dont unlike it until you liked !",
                    totalLikes: currentSession.likeCount,
                    likedBy: nameOfLiker,
                    isNewLike: false 
                });
            }

            if (updatedSession.likeCount < 0) {
                updatedSession.likeCount = 0;
                await updatedSession.save();
            }

            return res.status(200).json({ 
                success: true, 
                message: "Like removed successfully.",
                totalLikes: updatedSession.likeCount, 
                likedBy: nameOfLiker,
                isNewLike: false
            });
        }

        res.status(400).json({ success: false, message: "Invalid action! Use 'like' or 'unlike'." });

    } catch (error) {
        console.error("Like API Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


exports.getViewerCount = async (req, res) => {
    try {
        const { sessionId } = req.params; 

        const session = await LiveSession.findById(sessionId).select('viewerCount');

        if (!session) {
            return res.status(404).json({ success: false, message: "Session does not found" });
        }

        res.status(200).json({ 
            success: true, 
            viewerCount: session.viewerCount 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



exports.getLikeStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await LiveSession.findById(sessionId)
            .select('likeCount likedByUsers') 
            .populate('likedByUsers', 'fullName'); 

        if (!session) {
            return res.status(404).json({ success: false, message: "Session nahi mila!" });
        }

        const likersNames = session.likedByUsers.map(user => user.fullName);

        res.status(200).json({
            success: true,
            totalLikes: session.likeCount,    
            allLikedBy: likersNames        
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};