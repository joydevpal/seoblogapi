const User = require("../models/User");
const Blog = require("../models/Blog");
const shortId = require("shortid");
const jwt = require("jsonwebtoken");
const expressJwt = require("express-jwt");
const _ = require("lodash");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.preSignup = (req, res) => {
	const { name, email, password } = req.body;
	User.findOne({ email: email.toLowerCase() }).exec((err, user) => {
		if (user) {
			return res.status(400).json({
				error: "Email is taken"
			});
		}

		const token = jwt.sign({ name, email, password }, process.env.JWT_ACCOUNT_ACTIVATION, {
			expiresIn: "10m"
		});

		const emailData = {
			from: process.env.EMAIL_FROM,
			to: email,
			subject: `Account activation link`,
			html: `
				<p>Please use the following link to activate your account:</p>
				<p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
				<hr />
				<p>This email may contain sensitive information</p>
				<p>https://seoblog.com</p>
			`
		};

		sgMail.send(emailData).then(sent => {
			return res.json({
				message: `Email has been sent to ${email}. Follow the instructions to activate your account.`
			});
		});
		console.log(token);
	});
};

// exports.signup = (req, res) => {
// 	User.findOne({ email: req.body.email }).exec((err, user) => {
// 		if (user) {
// 			return res.status(400).json({
// 				error: "Email is already exists in our database"
// 			});
// 		}
// 		const { name, email, password } = req.body;
// 		const username = shortId.generate();
// 		const profile = `${process.env.CLIENT_URL}/profile/${username}`;

// 		const newUser = new User({ name, email, password, profile, username });
// 		newUser.save((err, success) => {
// 			if (err) {
// 				return res.status(400).json({
// 					error: err
// 				});
// 			}
// 			return res.json({
// 				message: "Signup Success! Please signin."
// 			});
// 		});
// 	});
// };

exports.signup = (req, res) => {
	const token = req.body.token;
	if (token) {
		jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decoded) {
			if (err) {
				return res.status(401).json({
					error: "Expired link. Signup again."
				});
			}
			const { name, email, password } = jwt.decode(token);

			const username = shortId.generate();
			const profile = `${process.env.CLIENT_URL}/profile/${username}`;

			const user = new User({ name, email, password, profile, username });
			user.save((err, user) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}
				return res.json({
					message: "Signup Success. Please signin."
				});
			});
		});
	} else {
		return res.json({
			message: "Something went wrong. Please try again."
		});
	}
};

exports.signin = (req, res) => {
	const { email, password } = req.body;
	User.findOne({ email }).exec((err, user) => {
		// check if user exists
		if (err || !user) {
			return res.status(400).json({
				error: "User with this email does not exists. Please signup."
			});
		}
		// check if the password is authenticated
		if (!user.authenticate(password)) {
			return res.status(400).json({
				// error: "Email and password do not match"
				error: err
			});
		}
		// generate jwt token
		const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
			expiresIn: "1d"
		});
		res.cookie("token", token, { expiresIn: "1d" });
		const { _id, username, name, email, role } = user;
		return res.json({
			token,
			user: { _id, username, name, email, role }
		});
	});
};

exports.signout = (req, res) => {
	res.clearCookie("token");
	res.json({
		message: "Signout Success!"
	});
};

exports.requireSignin = expressJwt({
	secret: process.env.JWT_SECRET
});

exports.authMiddleware = (req, res, next) => {
	const authUserId = req.user._id;
	User.findById({ _id: authUserId }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User not found"
			});
		}
		req.profile = user;
		next();
	});
};

exports.adminMiddleware = (req, res, next) => {
	const adminUserId = req.user._id;
	User.findById({ _id: adminUserId }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User not found"
			});
		}
		if (user.role !== 1) {
			return res.status(400).json({
				error: "Admin Resource. Access denied"
			});
		}
		req.profile = user;
		next();
	});
};

// Middleware for user can update and delete post
exports.canUpdateDeleteBlog = (req, res, next) => {
	const slug = req.params.slug.toLowerCase();
	Blog.findOne({ slug }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		let authorizedUser = data.postedBy._id.toString() === req.profile._id.toString();
		if (!authorizedUser) {
			return res.status(400).json({
				error: "You are not authorized"
			});
		}
		next();
	});
};

exports.forgotPassword = (req, res) => {
	const { email } = req.body;
	User.findOne({ email }).exec((err, user) => {
		if (err || !user) {
			return res.status(401).json({
				error: "User with that email does not exist"
			});
		}
		const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, {
			expiresIn: "10m"
		});

		// email reset password link to the user
		const emailData = {
			from: process.env.EMAIL_FROM,
			to: email,
			subject: `Password reset link`,
			html: `
				<p>Please use the following link to reset your password:</p>
				<p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
				<hr />
				<p>This email may contain sensitive information</p>
				<p>https://seoblog.com</p>
			`
		};

		// set password reset link in database
		user.updateOne({ resetPasswordLink: token }).exec((err, success) => {
			if (err) {
				return res.json({
					error: err
				});
			} else {
				sgMail.send(emailData).then(sent => {
					return res.json({
						message: `Email has been sent to ${email}. Follow the instruction to reset your password. Link expires in 10 minutes.`
					});
				});
				console.log(token);
			}
		});
	});
};

exports.resetPassword = (req, res) => {
	const { resetPasswordLink, newPassword } = req.body;

	if (resetPasswordLink) {
		jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(err, decoded) {
			if (err) {
				return res.status(401).json({
					error: "Expired link. Try again."
				});
			}
			User.findOne({ resetPasswordLink }, (err, user) => {
				if (err || !user) {
					return res.status(401).json({
						error: "Something went wrong. Try later."
					});
				}
				const updatedFields = {
					password: newPassword,
					resetPasswordLink: ""
				};
				user = _.extend(user, updatedFields);
				user.save((err, result) => {
					if (err) {
						return res.status(400).json({
							error: err
						});
					}
					res.json({
						message: `Great! Now you can login with your new password`
					});
				});
			});
		});
	}
};

// Google Social Login
exports.googleLogin = (req, res) => {
	const idToken = req.body.tokenId;
	client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID }).then(response => {
		const { email_verified, name, email, jti } = response.payload;

		if (email_verified) {
			User.findOne({ email }).exec((err, user) => {
				if (user) {
					// console.log(user);
					const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
						expiresIn: "1d"
					});
					res.cookie("token", token, { expiresIn: "1d" });
					const { _id, email, name, role, username } = user;
					return res.json({ token, user: { _id, email, name, role, username } });
				} else {
					let username = shortId.generate();
					let profile = `${process.env.CLIENT_URL}/profile/${username}`;
					let password = jti;
					user = new User({ name, email, profile, username, password });
					user.save((err, data) => {
						if (err) {
							return res.status(400).json({
								error: err
							});
						}
						const token = jwt.sign({ _id: data._id }, process.env.JWT_SECRET, {
							expiresIn: "1d"
						});
						res.cookie("token", token, { expiresIn: "1d" });
						const { _id, email, name, role, username } = data;
						return res.json({ token, user: { _id, email, name, role, username } });
					});
				}
			});
		} else {
			return res.status(400).json({
				error: "Google login failed. Try again."
			});
		}
	});
};
