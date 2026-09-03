const Video = require('../../models/Articles/VideoBlog');

const getYoutubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};


exports.addVideo = async (req, res) => {
    try {
        const { title, description, videoUrl, category } = req.body;
        const videoId = getYoutubeId(videoUrl);
        
        if (!videoId) return res.status(400).json({ message: "Invalid YouTube URL" });

        const newVideo = new Video({
            title,
            description,
            videoUrl,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            category
        });

        await newVideo.save();
        res.status(201).json({ message: "Video added by Admin", video: newVideo });
    } catch (error) {
        res.status(500).json({ message: "Error adding video", error: error.message });
    }
};

exports.updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.videoUrl) {
            const videoId = getYoutubeId(updateData.videoUrl);
            if (videoId) {
                updateData.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
        }

        const updatedVideo = await Video.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({ message: "Video updated successfully", updatedVideo });
    } catch (error) {
        res.status(500).json({ message: "Error updating video", error: error.message });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        await Video.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Video deleted by Admin" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting video", error: error.message });
    }
};

exports.getAdminVideos =  async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalVideos = await Video.countDocuments();

        const videos = await Video.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            totalVideos,
            totalPages: Math.ceil(totalVideos / limit),
            currentPage: page,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching admin videos", error: error.message });
    }
};

exports.getUserVideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalVideos = await Video.countDocuments({ isActive: true });

        const videos = await Video.find({ isActive: true })
            .sort({ createdAt: -1 }) 
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: videos.length,
            totalVideos,
            totalPages: Math.ceil(totalVideos / limit),
            currentPage: page,
            data: videos
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching videos", error: error.message });
    }
};