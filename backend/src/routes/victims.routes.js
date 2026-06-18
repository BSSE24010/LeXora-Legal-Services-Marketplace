const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { getMe, updateMe } = require("../controllers/victims.controller");

router.use(requireAuth, requireRole("victim"));

router.get("/me", getMe);
router.put("/me", updateMe);

module.exports = router;

