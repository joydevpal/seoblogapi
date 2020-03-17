const User = require("../models/User");
const Blog = require("../models/Blog");
const _ = require("lodash");
const formidable = require("formidable");
const fs = require("fs");

exports.read = (req, res) => {
	req.profile.hashed_password = undefined;
	return res.json(req.profile);
};

exports.publicProfile = (req, res) => {
	let username = req.params.username;
	let user;
	let blogs;

	User.findOne({ username }).exec((err, userFromDB) => {
		if (err || !userFromDB) {
			return res.status(400).json({
				error: err
			});
		}
		user = userFromDB;
		let userId = user._id;
		Blog.find({ postedBy: userId })
			.populate("categories", "_id name slug")
			.populate("tags", "_id name slug")
			.populate("postedBy", "_id name")
			.limit(10)
			.select("_id title slug excerpt categories tags postedBy createdAt updatedAt")
			.exec((err, data) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}
				user.photo = undefined;
				user.hashed_password = undefined;
				res.json({
					user,
					blogs: data
				});
			});
	});
};

// updating user profile
exports.update = (req, res) => {
	let form = new formidable.IncomingForm();
	form.keepExtensions = true;
	form.parse(req, (err, fields, files) => {
		if (err) {
			return res.status(400).json({
				error: "Photo could not be uploaded"
			});
		}
		let user = req.profile;
		user = _.extend(user, fields);

		if (fields.password && fields.password.length < 6) {
			return res.status(400).json({
				error: "Password should be min 6 characters long"
			});
		}

		if (files.photo) {
			if (files.photo.size > 10000000) {
				return res.status(400).json({
					error: "Image should be less than 1 MB"
				});
			}
			user.photo.data = fs.readFileSync(files.photo.path);
			user.photo.contentType = files.photo.type;
		}
		user.save((err, result) => {
			if (err) {
				return res.status(400).json({
					error: err
				});
			}
			user.hashed_password = undefined;
			user.salt = undefined;
			user.photo = undefined;

			res.json(user);
		});
	});
};

// updating profile photo
exports.photo = (req, res) => {
	const username = req.params.username;
	User.findOne({ username }).exec((err, user) => {
		if (err || !user) {
			return res.status(400).json({
				error: "User not found"
			});
		}
		if (user.photo.data) {
			res.set("Content-Type", user.photo.contentType);
			return res.send(user.photo.data);
		}
	});
};
