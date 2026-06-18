const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { getMe, markRead } = require("../controllers/notifications.controller");

router.use(requireAuth);

router.get("/me", getMe);
router.patch("/:id/read", markRead);

module.exports = router;

