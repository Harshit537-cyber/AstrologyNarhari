const BankAccount = require('../../models/Partner/BankAccount');

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

        const bankAccount = new BankAccount({
            partnerId: req.user.id,
            accountHolderName,
            bankName,
            accountNumber,
            ifscCode,
            branchName
        });

        await bankAccount.save();

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

module.exports = {
    addBankAccount,
    updateBankAccount,
    getBankAccount
};