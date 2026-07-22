const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const userAuthRoutes = require("./routes/UserRoutes/userAuth");
const partnerAuthRoutes = require("./routes/PatnerRoutes/partnerAuth");
const adminAuthRoutes = require("./routes/AdminRoutes/adminAuth");
const bookingRoutes = require("./routes/bookingRoutes/bookingRoutes");
const bannerRoutes = require("./routes/AdminRoutes/bannerRoutes")
const productCategoryRoutes = require("./routes/AdminRoutes/E-comm/categoryRoutes")
const productRoutes = require("./routes/AdminRoutes/E-comm/productRoutes")

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/user", userAuthRoutes);
app.use("/api/partner", partnerAuthRoutes);

app.use("/api/user/profile", require("./routes/UserRoutes/userProfileRoutes"));
app.use("/api/review", require("./routes/review/reviewRoutes"));
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", require("./routes/UserRoutes/walletRoutes"));
app.use("/api/match", require("./routes/UserRoutes/kundaliMatchMakingRoutes"));
app.use("/api/coupon", require("./routes/UserRoutes/couponRoutes"));



// admin routes
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/banner", bannerRoutes);
app.use("/api/admin/product-category",productCategoryRoutes)
app.use("/api/admin/product",productRoutes)
<<<<<<< HEAD
app.use("/api/admin/coupon",couponRoutes);
app.use("/api/agora", require("./routes/agora/agoraRoutes"));
=======
app.use("/api/admin/coupon", require("./routes/AdminRoutes/E-comm/couponRoutes"))
>>>>>>> 4a631da108c45db9b42e2a08351793461e8db0a4

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Astrlogy Narhari Backend Running "
    });
});

module.exports = app;