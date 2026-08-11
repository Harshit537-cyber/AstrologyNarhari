const express = require("express");
const router = express.Router();

const {
    createPandit,
    getAllPandits,
    getPanditById,
    updatePandit,
    deletePandit,
    updatePanditApprovalStatus,
    updatePanditVerification
} = require("../../controllers/admin/panditJiController");



const { verifyToken, isAdmin } = require("../../middleware/auth");

const upload = require("../../middleware/upload");


// =====================================================
// CREATE PANDIT
// =====================================================

router.post(
    "/create-pandit",
    verifyToken,
    isAdmin,
    upload.single("profilePic"),
    createPandit
);


// =====================================================
// GET ALL PANDITS
// =====================================================

router.get(
    "/get-pandits",
    verifyToken,
    isAdmin,
    getAllPandits
);


// =====================================================
// GET SINGLE PANDIT
// =====================================================

router.get(
    "/get-pandit/:id",
    verifyToken,
    isAdmin,
    getPanditById
);


// =====================================================
// UPDATE PANDIT
// =====================================================

router.put(
    "/update-pandit/:id",
    verifyToken,
    isAdmin,
    upload.single("profilePic"),
    updatePandit
);


// =====================================================
// DELETE PANDIT
// =====================================================

router.delete(
    "/delete-pandit/:id",

    verifyToken,
    isAdmin,
    deletePandit
);


// =====================================================
// UPDATE APPROVAL STATUS
// =====================================================

router.patch(
    "/update-approval-status/:id",
    verifyToken,
    isAdmin,
    updatePanditApprovalStatus
);


// =====================================================
// UPDATE VERIFICATION
// =====================================================

router.patch(
    "/update-verification/:id",
    updatePanditVerification
);


module.exports = router;