const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { createPayment, releasePayment, myPayments } = require("../controllers/payments.controller");

router.use(requireAuth);

router.post("/", requireRole("victim"), createPayment);
router.patch("/:id/release", requireRole("victim", "admin"), releasePayment);
router.get("/me", myPayments);

module.exports = router;

