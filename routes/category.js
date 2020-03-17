const express = require("express");
const router = express.Router();

// controller & middlewares
const { create, list, read, remove } = require("../controllers/category");
const { requireSignin, adminMiddleware } = require("../controllers/auth");

// validators
const { runValidation } = require("../validators");
const { categoryValidator } = require("../validators/category");

router.post(
	"/category",
	runValidation,
	categoryValidator,
	requireSignin,
	adminMiddleware,
	create
);
router.get("/categories", list);
router.get("/category/:slug", read);
router.delete("/category/:slug", requireSignin, adminMiddleware, remove);

module.exports = router;
