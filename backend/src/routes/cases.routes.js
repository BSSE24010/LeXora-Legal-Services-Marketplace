const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/role.middleware");
const { createCase, listCases, getCase, patchStatus } = require("../controllers/cases.controller");

router.use(requireAuth);

router.post("/", requireRole("victim"), createCase);
router.get("/", listCases); // victims => own, lawyers/admin => all open or own depending controller
router.get("/:id", getCase);
router.patch("/:id/status", requireRole("victim"), patchStatus);

module.exports = router;

