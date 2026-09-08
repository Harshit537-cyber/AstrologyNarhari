const express = require("express");
const { verifyToken, isAdmin } = require("../../middleware/auth");
const { setPartnerCommission, getAllCommissions, getCommissionById,getPartnerByIdForCommission,getCommissionByPartnerId, getAllPartnersForCommission,updateCommission, deleteCommission  } = require("../../controllers/admin/adminCommissionController");
const router = express.Router();

router.post("/set-commision", verifyToken, isAdmin, setPartnerCommission);

router.get("/all-commissions",verifyToken, isAdmin, getAllCommissions);

router.get("/:id", verifyToken, isAdmin, getCommissionById);

router.get("/partner/:partnerId", verifyToken, isAdmin, getCommissionByPartnerId );

router.patch("/update-commission/:id", verifyToken, isAdmin,  updateCommission);

router.delete("/delete/:id", verifyToken, isAdmin, deleteCommission );

router.get("/partners/all", verifyToken, isAdmin,getAllPartnersForCommission);

router.get("/partner-by-id/:id", verifyToken, isAdmin,getPartnerByIdForCommission)
module.exports = router;