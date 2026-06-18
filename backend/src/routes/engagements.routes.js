// const router = require("express").Router();
// const { requireAuth } = require("../middlewares/auth.middleware");
// const { getMyEngagements, getById, closeEngagement } = require("../controllers/engagements.controller");


// router.use(requireAuth);

// router.get("/me", getMyEngagements);
// router.get("/:id", getById);
// router.patch("/:id/close", closeEngagement);
// router.patch("/:id/complete", requireRole("lawyer"), completeEngagement);

// module.exports = router;

const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { 
  getMyEngagements, 
  getById, 
  closeEngagement,
  completeEngagement 
} = require("../controllers/engagements.controller");

router.use(requireAuth);

router.get("/me", getMyEngagements);
router.get("/:id", getById);
router.patch("/:id/close", closeEngagement);
router.patch("/:id/complete", requireRole("lawyer"), completeEngagement);

module.exports = router;
