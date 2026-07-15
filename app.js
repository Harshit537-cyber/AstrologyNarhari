const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const userAuthRoutes = require("./routes/UserRoutes/userAuth");
const partnerAuthRoutes = require("./routes/PatnerRoutes/partnerAuth");
const adminAuthRoutes = require("./routes/AdminRoutes/adminAuth");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/user", userAuthRoutes);
app.use("/api/partner", partnerAuthRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/otp", require("./routes/otp/otpRoutes"));
app.use("/api/user/profile", require("./routes/UserRoutes/userProfileRoutes"));
app.use("/api/review", require("./routes/review/reviewRoutes"))

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Astrlogy Narhari Backend Running "
    });
});

module.exports = app;