const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const userAuthRoutes = require("./routes/UserRoutes/userAuth");
const partnerAuthRoutes = require("./routes/PatnerRoutes/partnerAuth");
const panditAuthRoutes = require("./routes/PanditRoutes/panditAuth");
const adminAuthRoutes = require("./routes/AdminRoutes/adminAuth");
const adminNotificationRoutes = require("./routes/AdminRoutes/adminNotificationRoutes");
const bookingRoutes = require("./routes/bookingRoutes/bookingRoutes");
const bannerRoutes = require("./routes/AdminRoutes/bannerRoutes");
const productCategoryRoutes = require("./routes/AdminRoutes/E-comm/categoryRoutes");
const productRoutes = require("./routes/AdminRoutes/E-comm/productRoutes");
const couponRoutes = require("./routes/AdminRoutes/E-comm/couponRoutes");
const cartRoutes = require("./routes/UserRoutes/cartRoutes");
const ticketRoutes = require("./routes/ticketRoutes/ticketRoutes");
const razorpayInstance = require("./config/razorpay");

const sessionRoutes = require("./routes/sessionRoutes/sessionRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/user", userAuthRoutes);
app.use("/api/user/cart", cartRoutes);
app.use("/api/partner", partnerAuthRoutes);
app.use("/api/pandit", panditAuthRoutes);

app.use("/api/user/profile", require("./routes/UserRoutes/userProfileRoutes"));
app.use("/api/review", require("./routes/review/reviewRoutes"));
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", require("./routes/UserRoutes/walletRoutes"));
app.use("/api/match", require("./routes/UserRoutes/kundaliMatchMakingRoutes"));
app.use("/api/coupon", require("./routes/UserRoutes/couponRoutes"));
app.use("/api/banner", require("./routes/UserRoutes/bannerRoutes"));
app.use("/api/product", require("./routes/UserRoutes/productRoutes"));
app.use("/api/article", require("./routes/Articles/ArticleRoutes"));
app.use("/api/call", require("./routes/callRoutes/callRoutes"));

app.use("/api/session", sessionRoutes);

app.use("/api/order", require("./routes/UserRoutes/orderRoutes"));
app.use("/api/rituals", require("./routes/Rituals/RitualsRoutes"));
app.use("/api/shipping", require("./routes/UserRoutes/addressRoutes"));
app.use("/api/tickets", ticketRoutes);

app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/admin/banner", bannerRoutes);
app.use("/api/admin/product-category", productCategoryRoutes);
app.use("/api/admin/product", productRoutes);
app.use("/api/admin/coupon", couponRoutes);
app.use("/api/agora", require("./routes/agora/agoraRoutes"));
app.use("/api/admin/card", require("./routes/AdminRoutes/cardRoutes"));
app.use("/api/admin/shop/banner", require("./routes/AdminRoutes/E-comm/topBannerRoutes"));
app.use("/api/partner/rating", require("./routes/PatnerRoutes/partnerRatingRoutes"));
app.use("/api/admin/pandit", require("./routes/AdminRoutes/panditJiRoutes"));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Astrology Narhari Backend Running"
    });
});

module.exports = app;