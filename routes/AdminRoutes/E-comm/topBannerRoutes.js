const express = require("express");
const router = express.Router();

const upload = require("../../../middleware/upload");
const controller = require("../../../controllers/admin/E-comm/topBannerController");

router.post("/add", upload.single("image"), controller.addTopBanner);

router.get("/", controller.getTopBanners);

router.get("/:id", controller.getTopBannerById);

router.put(
  "/:id",
  upload.single("image"),
  controller.updateTopBanner
);

router.delete("/:id", controller.deleteTopBanner);

module.exports = router;