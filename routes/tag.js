const express = require("express");
const router = express.Router();

// controllers & middlewares
const { create, list, read, remove } = require("../controllers/tag");
const { requireSignin, adminMiddleware } = require("../controllers/auth");

// validators
const { runValidation } = require("../validators");
const { tagValidator } = require("../validators/tag");

// routes
router.post(
	"/tag",
	requireSignin,
	adminMiddleware,
	runValidation,
	tagValidator,
	create
);
router.get("/tags", list);
router.get("/tag/:slug", read);
router.delete("/tag/:slug", requireSignin, adminMiddleware, remove);

module.exports = router;
