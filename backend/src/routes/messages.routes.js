const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/upload.middleware");
const {
  listForEngagement,
  sendMessage,
  uploadAttachment,
} = require("../controllers/messages.controller");

router.use(requireAuth);

router.get("/engagement/:engagementId", listForEngagement);
router.post("/engagement/:engagementId", sendMessage);
router.post("/engagement/:engagementId/upload", upload.single("file"), uploadAttachment);

module.exports = router;

