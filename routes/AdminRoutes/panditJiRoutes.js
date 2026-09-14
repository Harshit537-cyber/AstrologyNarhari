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


router.post(
    "/create-pandit",
    verifyToken,
    isAdmin,
    upload.single("profilePic"),
    createPandit
);




router.get(
    "/get-pandits",
    verifyToken,
    isAdmin,
    getAllPandits
);




router.get(
    "/get-pandit/:id",
    verifyToken,
    isAdmin,
    getPanditById
);




router.put(
    "/update-pandit/:id",
    verifyToken,
    isAdmin,
    upload.single("profilePic"),
    updatePandit
);




router.delete(
    "/delete-pandit/:id",

    verifyToken,
    isAdmin,
    deletePandit
);




router.patch(
    "/update-approval-status/:id",
    verifyToken,
    isAdmin,
    updatePanditApprovalStatus
);


router.patch(
    "/update-verification/:id",
    updatePanditVerification
);


module.exports = router;