const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const userAuthRoutes = require("./routes/UserRoutes/userAuth");
const partnerAuthRoutes = require("./routes/PatnerRoutes/partnerAuth");
const adminAuthRoutes = require("./routes/AdminRoutes/adminAuth");
const bookingRoutes = require("./routes/bookingRoutes/bookingRoutes");
const bannerRoutes = require("./routes/AdminRoutes/bannerRoutes")

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/user", userAuthRoutes);
app.use("/api/partner", partnerAuthRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/admin/banner", bannerRoutes);
app.use("/api/user/profile", require("./routes/UserRoutes/userProfileRoutes"));
app.use("/api/review", require("./routes/review/reviewRoutes"));
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", require("./routes/UserRoutes/walletRoutes"));
app.use("/api/match", require("./routes/UserRoutes/kundaliMatchMakingRoutes"))

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Astrlogy Narhari Backend Running "
    });
});

module.exports = app;