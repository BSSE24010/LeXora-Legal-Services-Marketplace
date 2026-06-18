const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { createDispute, myDisputes, resolveDispute } = require("../controllers/disputes.controller");

router.use(requireAuth);

router.post("/", createDispute);
router.get("/me", myDisputes);
router.patch("/:id/resolve", requireRole("admin"), resolveDispute);

module.exports = router;

