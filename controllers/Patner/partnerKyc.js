const Partner = require('../../models/Partner/Partner');
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');

const uploadToCloudinary = async (filePath, folder) => {
    try {
        const result = await cloudinary.uploader.upload(filePath, { folder });
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return result.secure_url;
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
};

const uploadKycDocuments = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id);
        if (!partner) {
            if (req.files) {
                Object.keys(req.files).forEach((key) => {
                    req.files[key].forEach((file) => {
                        if (fs.existsSync(file.path)) {
                            fs.unlinkSync(file.path);
                        }
                    });
                });
            }
            return res.status(404).json({ message: 'Partner not found' });
        }

        const files = req.files || {};

        const cleanUploadedFiles = () => {
            Object.keys(files).forEach((key) => {
                files[key].forEach((file) => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            });
        };

        if (files.selfie && files.selfie[0]) {
            if (partner.selfie && partner.selfie.status && partner.selfie.status !== 'Rejected') {
                cleanUploadedFiles();
                return res.status(400).json({ message: 'Selfie is already approved or pending review' });
            }
        }

        if (files.nationalId && files.nationalId[0]) {
            if (partner.nationalId && partner.nationalId.status && partner.nationalId.status !== 'Rejected') {
                cleanUploadedFiles();
                return res.status(400).json({ message: 'National ID is already approved or pending review' });
            }
        }

        if (files.astrologyCertificate && files.astrologyCertificate[0]) {
            if (partner.astrologyCertificate && partner.astrologyCertificate.status && partner.astrologyCertificate.status !== 'Rejected') {
                cleanUploadedFiles();
                return res.status(400).json({ message: 'Astrology Certificate is already approved or pending review' });
            }
        }

        if (files.addressProof && files.addressProof[0]) {
            if (partner.addressProof && partner.addressProof.status && partner.addressProof.status !== 'Rejected') {
                cleanUploadedFiles();
                return res.status(400).json({ message: 'Address Proof is already approved or pending review' });
            }
        }

        let updated = false;

        if (files.selfie && files.selfie[0]) {
            const url = await uploadToCloudinary(files.selfie[0].path, 'partners/kyc/selfie');
            partner.selfie = {
                url,
                status: 'Pending',
                uploadedAt: new Date()
            };
            updated = true;
        }

        if (files.nationalId && files.nationalId[0]) {
            const url = await uploadToCloudinary(files.nationalId[0].path, 'partners/kyc/national_id');
            partner.nationalId = {
                url,
                status: 'Pending',
                uploadedAt: new Date()
            };
            updated = true;
        }

        if (files.astrologyCertificate && files.astrologyCertificate[0]) {
            const url = await uploadToCloudinary(files.astrologyCertificate[0].path, 'partners/kyc/certificates');
            partner.astrologyCertificate = {
                url,
                status: 'Pending',
                uploadedAt: new Date()
            };
            updated = true;
        }

        if (files.addressProof && files.addressProof[0]) {
            const url = await uploadToCloudinary(files.addressProof[0].path, 'partners/kyc/address');
            partner.addressProof = {
                url,
                status: 'Pending',
                uploadedAt: new Date()
            };
            updated = true;
        }

        if (updated) {
            const docs = [
                partner.selfie,
                partner.nationalId,
                partner.astrologyCertificate,
                partner.addressProof
            ].filter(doc => doc && doc.url);

            if (docs.some(doc => doc.status === 'Rejected')) {
                partner.kycStatus = 'Rejected';
            } else if (docs.length === 4 && docs.every(doc => doc.status === 'Approved')) {
                partner.kycStatus = 'Approved';
            } else {
                partner.kycStatus = 'Pending';
            }

            await partner.save();
        }

        res.status(200).json({
            message: 'Documents uploaded successfully',
            kycStatus: partner.kycStatus,
            selfie: partner.selfie,
            nationalId: partner.nationalId,
            astrologyCertificate: partner.astrologyCertificate,
            addressProof: partner.addressProof
        });
    } catch (error) {
        if (req.files) {
            Object.keys(req.files).forEach((key) => {
                req.files[key].forEach((file) => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            });
        }
        res.status(500).json({ error: error.message });
    }
};

const getKycStatus = async (req, res) => {
    try {
        const partner = await Partner.findById(req.user.id);
        if (!partner) {
            return res.status(404).json({ message: 'Partner not found' });
        }

        res.status(200).json({
            kycStatus: partner.kycStatus,
            selfie: partner.selfie,
            nationalId: partner.nationalId,
            astrologyCertificate: partner.astrologyCertificate,
            addressProof: partner.addressProof
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { uploadKycDocuments, getKycStatus };