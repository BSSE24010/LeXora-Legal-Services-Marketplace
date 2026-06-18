const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const usersRoutes = require("./routes/users.routes");
const victimsRoutes = require("./routes/victims.routes");
const lawyersRoutes = require("./routes/lawyers.routes");
const casesRoutes = require("./routes/cases.routes");
const proposalsRoutes = require("./routes/proposals.routes");
const engagementsRoutes = require("./routes/engagements.routes");
const messagesRoutes = require("./routes/messages.routes");
const paymentsRoutes = require("./routes/payments.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const disputesRoutes = require("./routes/disputes.routes");
const adminRoutes = require("./routes/admin.routes");

const { ok } = require("./utils/response");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => ok(res, { status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/victims", victimsRoutes);
app.use("/api/lawyers", lawyersRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/proposals", proposalsRoutes);
app.use("/api/engagements", engagementsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/disputes", disputesRoutes);
app.use("/api/admin", adminRoutes);

module.exports = app;

