const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { createReview, listForLawyer } = require("../controllers/reviews.controller");

router.use(requireAuth);

router.post("/", requireRole("victim"), createReview);
router.get("/lawyer/:lawyerId", listForLawyer);

module.exports = router;

