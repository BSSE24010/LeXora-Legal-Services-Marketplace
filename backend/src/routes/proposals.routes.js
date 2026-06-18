const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const {
  createProposal,
  getForCase,
  acceptProposal,
  declineProposal,
} = require("../controllers/proposals.controller");

router.use(requireAuth);

router.post("/", requireRole("lawyer"), createProposal);
router.get("/case/:caseId", requireRole("victim"), getForCase);
router.patch("/:id/accept", requireRole("victim"), acceptProposal);
router.patch("/:id/decline", requireRole("victim"), declineProposal);

module.exports = router;

