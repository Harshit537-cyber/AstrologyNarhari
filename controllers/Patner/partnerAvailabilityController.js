const Partner = require('../../models/Partner/Partner');


exports.getServiceAvailability = async (req, res) => {
    try {
        const partnerId = req.user.id;
        const partner = await Partner.findById(partnerId).select('allowAudioCalls allowVideoCalls allowChat isAcceptingRequests');

        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                allowAudioCalls: partner.allowAudioCalls,
                allowVideoCalls: partner.allowVideoCalls,
                allowChat: partner.allowChat,
                isAcceptingRequests: partner.isAcceptingRequests
            }
        });
    } catch (error) {
        console.error("Get Availability Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};

// 2. Toggle specific service (audio, video, or chat)
exports.toggleServiceAvailability = async (req, res) => {
    try {
        const partnerId = req.user.id;
        const { service, status } = req.body; // service: 'audio' | 'video' | 'chat', status: true | false

        if (!service || typeof status !== 'boolean') {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid payload. 'service' (audio/video/chat) and boolean 'status' are required." 
            });
        }

        const partner = await Partner.findById(partnerId);
        if (!partner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        let message = "";
        if (service === 'audio') {
            partner.allowAudioCalls = status;
            message = status ? "Audio calls enabled successfully" : "Audio calls disabled successfully";
        } else if (service === 'video') {
            partner.allowVideoCalls = status;
            message = status ? "Video calls enabled successfully" : "Video calls disabled successfully";
        } else if (service === 'chat') {
            partner.allowChat = status;
            message = status ? "Chat enabled successfully" : "Chat disabled successfully";
        } else {
            return res.status(400).json({ success: false, message: "Invalid service type. Use 'audio', 'video', or 'chat'." });
        }

        await partner.save();

        return res.status(200).json({
            success: true,
            message,
            data: {
                allowAudioCalls: partner.allowAudioCalls,
                allowVideoCalls: partner.allowVideoCalls,
                allowChat: partner.allowChat
            }
        });

    } catch (error) {
        console.error("Toggle Service Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
    }
};