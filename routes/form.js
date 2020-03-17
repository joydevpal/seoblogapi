const express = require("express");
const router = express.Router();

// controllers
const { contactForm, contactBlogAuthorForm } = require("../controllers/form");

// validators
const { runValidation } = require("../validators");
const { contactFormValidator } = require("../validators/form");

router.post("/contact", runValidation, contactFormValidator, contactForm);
router.post("/contact-blog-author", runValidation, contactFormValidator, contactBlogAuthorForm);

module.exports = router;
