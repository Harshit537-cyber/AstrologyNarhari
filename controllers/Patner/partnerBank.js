const BankAccount = require('../../models/Partner/BankAccount');
const Partner = require('../../models/Partner/Partner');

const addBankAccount = async (req, res) => {
    try {
        const { accountHolderName, bankName, accountNumber, ifscCode, branchName } = req.body;

        if (!accountHolderName || !bankName || !accountNumber || !ifscCode) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing"
            });
        }

        const existingAccount = await BankAccount.findOne({ partnerId: req.user.id });
        if (existingAccount) {
            return res.status(400).json({
                success: false,
                message: "Bank account already exists for this partner"
            });
        }

        const bankAccount = await BankAccount.create({
            partnerId: req.user.id,
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            branchName
        });

        res.status(201).json({
            success: true,
            message: "Bank account added successfully",
            bankAccount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const updateBankAccount = async (req, res) => {
    try {
        const { accountHolderName, bankName, accountNumber, ifscCode, branchName } = req.body;

        const bankAccount = await BankAccount.findOneAndUpdate(
            { partnerId: req.user.id },
            { accountHolderName, bankName, accountNumber, ifscCode, branchName },
            { new: true, runValidators: true }
        );

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Bank account updated successfully",
            bankAccount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getBankAccount = async (req, res) => {
    try {
        const bankAccount = await BankAccount.findOne({ partnerId: req.user.id });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                message: "Bank account not found"
            });
        }

        res.status(200).json({
            success: true,
            bankAccount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getAllPartnersWithBankForAdmin = async (req, res) => {
    try {
        const partners = await Partner.find().lean();
        const partnerIds = partners.map(p => p._id);
        const bankAccounts = await BankAccount.find({ partnerId: { $in: partnerIds } }).lean();

        const bankMap = {};
        bankAccounts.forEach(acc => {
            bankMap[acc.partnerId.toString()] = acc;
        });

        const data = partners.map(partner => ({
            ...partner,
            bankAccount: bankMap[partner._id.toString()] || null
        }));

        res.status(200).json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getPartnerWithBankByIdForAdmin = async (req, res) => {
    try {
        const { partnerId } = req.params;

        const partner = await Partner.findById(partnerId).lean();
        if (!partner) {
            return res.status(404).json({
                success: false,
                message: "Partner not found"
            });
        }

        const bankAccount = await BankAccount.findOne({ partnerId }).lean();

        res.status(200).json({
            success: true,
            data: {
                ...partner,
                bankAccount: bankAccount || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    addBankAccount,
    updateBankAccount,
    getBankAccount,
    getAllPartnersWithBankForAdmin,
    getPartnerWithBankByIdForAdmin
};