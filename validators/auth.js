const { check } = require("express-validator");

// signup validator
exports.userSignupValidator = [
	check("name")
		.not()
		.isEmpty()
		.withMessage("Name is required"),
	check("email")
		.isEmail()
		.withMessage("Must be a valid email address"),
	check("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters")
];

// signin validator
exports.userSigninValidator = [
	check("email")
		.isEmail()
		.withMessage("Must be a valid email address"),
	check("password")
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters")
];

// forgot password validator
exports.forgotPasswordValidator = [
	check("email")
		.not()
		.isEmpty()
		.isEmail()
		.withMessage("Must be a valid email address")
];

// reset password validator
exports.resetPasswordValidator = [
	check("newPassword")
		.not()
		.isEmpty()
		.isLength({ min: 6 })
		.withMessage("Password must be at least 6 characters")
];
