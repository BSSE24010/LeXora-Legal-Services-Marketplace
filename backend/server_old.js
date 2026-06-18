require("dotenv").config();

const express = require("express");
const cors = require("cors");

const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const victimsRoutes = require("./routes/victims");
const lawyersRoutes = require("./routes/lawyers");
const credentialsRoutes = require("./routes/credentials");
const casesRoutes = require("./routes/cases");
const proposalsRoutes = require("./routes/proposals");
const engagementsRoutes = require("./routes/engagements");
const paymentsRoutes = require("./routes/payments");
const messagesRoutes = require("./routes/messages");
const reviewsRoutes = require("./routes/reviews");
const notificationsRoutes = require("./routes/notifications");
const disputesRoutes = require("./routes/disputes");
const adminRoutes = require("./routes/admin");

const app = express();

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => res.json({ data: { ok: true } }));

app.use("/api/auth", authRoutes);

app.use("/api/victims", victimsRoutes);
app.use("/api/lawyers", lawyersRoutes);
app.use("/api/credentials", credentialsRoutes);
app.use("/api/cases", casesRoutes);
app.use("/api/proposals", proposalsRoutes);
app.use("/api/engagements", engagementsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/disputes", disputesRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

const port = Number(process.env.PORT || 5000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`LeXora backend listening on :${port}`);
});

