const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const { me } = require("../controllers/users.controller");

router.use(requireAuth);
router.get("/me", me);

module.exports = router;

