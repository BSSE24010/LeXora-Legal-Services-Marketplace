const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const {
  listUsers,
  setUserStatus,
  pendingCredentials,
  verifyCredential,
  listDisputes,
  analytics,
  resolveDispute,
} = require("../controllers/admin.controller");

router.use(requireAuth, requireRole("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/status", setUserStatus);
router.get("/credentials/pending", pendingCredentials);
router.patch("/credentials/:id/verify", verifyCredential);
router.get("/disputes", listDisputes);
router.patch("/disputes/:id/resolve", resolveDispute);
router.get("/analytics", analytics);

module.exports = router;