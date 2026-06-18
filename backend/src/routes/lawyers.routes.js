const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const {
  listVerified,
  getById,
  updateMe,
  myProposals,
  uploadCredential,
  myCredentials,
} = require("../controllers/lawyers.controller");
const { upload } = require("../middlewares/upload.middleware");

// Public routes
router.get("/", listVerified);

// Credentials — pending lawyers bhi upload kar sakein (sirf auth, no role check)
router.post("/credentials", requireAuth, upload.single("file"), uploadCredential);
router.get("/credentials", requireAuth, myCredentials);

// Lawyer only routes
router.put("/me", requireAuth, requireRole("lawyer"), updateMe);
router.get("/me/proposals", requireAuth, requireRole("lawyer"), myProposals);

// Public get by id — sab se last mein
router.get("/:id", getById);

module.exports = router;