const Blog = require("../models/Blog");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const User = require("../models/User");
const formidable = require("formidable");
const slugify = require("slugify");
const stripHtml = require("string-strip-html");
const { smartTrim } = require("../helpers/blog");
const _ = require("lodash");
const fs = require("fs");

exports.create = (req, res) => {
	let form = new formidable.IncomingForm();
	form.keepExtensions = true;
	form.parse(req, (err, fields, files) => {
		if (err) {
			return res.status(400).json({
				error: err
				//error: "Image could not upload"
			});
		}
		const { title, body, categories, tags } = fields;

		if (!title || !title.length) {
			return res.status(400).json({
				error: "Title is required"
			});
		}

		if (!body || body.length < 200) {
			return res.status(400).json({
				error: "Content is too short"
			});
		}

		if (!categories || categories.length === 0) {
			return res.status(400).json({
				error: "At least one category is required"
			});
		}

		if (!tags || tags.length === 0) {
			return res.status(400).json({
				error: "At least one tag is required"
			});
		}

		let blog = new Blog();
		blog.title = title;
		blog.slug = slugify(title).toLowerCase();
		blog.body = body;
		blog.excerpt = smartTrim(body, 320, " ", "...");
		blog.mtitle = `${title} | ${process.env.APP_NAME}`;
		blog.mdesc = stripHtml(body.substring(0, 160));
		blog.postedBy = req.user._id;

		// categories and tags
		let arrayOfCats = categories && categories.split(",");
		let arrayOfTags = tags && tags.split(",");

		if (files.photo) {
			if (files.photo.size > 10000000) {
				return res.status(400).json({
					error: "Image should be less than 1 MB in size"
				});
			}
			blog.photo.data = fs.readFileSync(files.photo.path);
			blog.photo.contentType = files.photo.type;
		}

		blog.save((err, result) => {
			if (err) {
				return res.status(400).json({
					error: err
				});
			}
			//res.json(result);
			Blog.findByIdAndUpdate(
				result._id,
				{
					$push: { categories: arrayOfCats }
				},
				{ new: true }
			).exec((err, result) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				} else {
					Blog.findByIdAndUpdate(
						result._id,
						{
							$push: { tags: arrayOfTags }
						},
						{ new: true }
					).exec((err, result) => {
						if (err) {
							return res.status(400).json({
								error: err
							});
						} else {
							return res.json(result);
						}
					});
				}
			});
		});
	});
};

exports.list = async (req, res) => {
	// Blog.find({})
	// 	.populate("categories", "_id name slug")
	// 	.populate("tags", "_id name slug")
	// 	.populate("postedBy", "_id name username")
	// 	.select("_id title slug excerpt categories tags postedBy createdAt updatedAt")
	// 	.exec((err, data) => {
	// 		if (err) {
	// 			res.status(400).json({
	// 				error: err
	// 			});
	// 		}
	// 		res.json(data);
	// 	});
	try {
		const blogs = await Blog.find({})
			.populate("categories", "_id name slug")
			.populate("tags", "_id name slug")
			.populate("postedBy", "_id name username")
			.select("_id title slug excerpt categories tags postedBy createdAt updatedAt");
		if (blogs) {
			res.json(blogs);
		} else {
			res.status(400).json({
				error: "No blogs found"
			});
		}
	} catch (err) {
		res.status(500).json({
			error: err
		});
	}
};

exports.listAllBlogCategoriesTags = (req, res) => {
	let limit = req.body.limit ? parseInt(req.body.limit) : 10;
	let skip = req.body.skip ? parseInt(req.body.skip) : 0;

	let blogs, categories, tags;

	Blog.find({})
		.populate("categories", "_id name slug")
		.populate("tags", "_id name slug")
		.populate("postedBy", "_id name username profile")
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limit)
		.select("_id title slug excerpt categories tags postedBy createdAt updatedAt")
		.exec((err, data) => {
			if (err) {
				res.status(400).json({
					error: err
				});
			}
			blogs = data;
			// get all categories
			Category.find({}).exec((err, c) => {
				if (err) {
					res.status(400).json({
						error: err
					});
				}
				categories = c;
				// get all tags
				Tag.find({}).exec((err, t) => {
					if (err) {
						res.status(400).json({
							error: err
						});
					}
					tags = t;
					// return all blogs, categories and tags
					return res.json({ blogs, categories, tags, size: blogs.length });
				});
			});
		});
};
exports.read = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Blog.findOne({ slug })
		.populate("categories", "_id name slug")
		.populate("tags", "_id name slug")
		.populate("postedBy", "_id name username")
		// .select("_id title slug body categories tags postedBy createdAt updatedAt")
		.select("-excerpt -__v")
		.exec((err, data) => {
			if (err) {
				res.status(400).json({
					error: err
				});
			}
			res.json(data);
		});
};
exports.remove = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Blog.findOneAndRemove({ slug }).exec((err, data) => {
		if (err) {
			return res.json({
				error: err
			});
		}
		res.json({
			message: "Blog deleted successfully"
		});
	});
};
exports.update = (req, res) => {
	const slug = req.params.slug.toLowerCase();

	Blog.findOne({ slug }).exec((err, oldBlog) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		let form = new formidable.IncomingForm();
		form.keepExtensions = true;
		form.parse(req, (err, fields, files) => {
			if (err) {
				return res.status(400).json({
					error: "Image could not upload"
				});
			}

			let slugBeforeMerge = oldBlog.slug;
			oldBlog = _.merge(oldBlog, fields);
			oldBlog.slug = slugBeforeMerge;

			const { body, mdesc, categories, tags } = fields;

			if (body) {
				oldBlog.excerpt = smartTrim(body, 320, " ", " ...");
				oldBlog.mdesc = stripHtml(body.substring(0, 160));
			}

			if (categories) {
				oldBlog.categories = categories.split(",");
			}

			if (tags) {
				oldBlog.tags = tags.split(",");
			}

			if (files.photo) {
				if (files.photo.size > 10000000) {
					return res.status(400).json({
						error: "Image should be less than 1 MB in size"
					});
				}
				oldBlog.photo.data = fs.readFileSync(files.photo.path);
				oldBlog.photo.contentType = files.photo.type;
			}

			oldBlog.save((err, result) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}
				res.json(result);
			});
		});
	});
};

exports.photo = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Blog.findOne({ slug })
		.select("photo")
		.exec((err, blog) => {
			if (err || !blog) {
				return res.status(400).json({
					error: err
				});
			}
			res.set("Content-Type", blog.photo.contentType);
			return res.send(blog.photo.data);
		});
};

// get related blogs
exports.listRelated = (req, res) => {
	const limit = req.body.limit ? parseInt(req.body.limit) : 3;
	const { _id, categories } = req.body.blog;

	Blog.find({ _id: { $ne: _id }, categories: { $in: categories } })
		.limit(limit)
		.populate("postedBy", "_id name username profile")
		.select("title slug excerpt postedBy createdAt updatedAt")
		.exec((err, blogs) => {
			if (err) {
				return res.status(400).json({
					error: "Blogs not found"
				});
			}
			res.json(blogs);
		});
};

// search items
exports.listSearch = (req, res) => {
	const { search } = req.query;
	if (search) {
		Blog.find({
			$or: [
				{ title: { $regex: search, $options: "i" } },
				{ body: { $regex: search, $options: "i" } }
			]
		})
			.select("-photo -body")
			.exec((err, blogs) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}
				res.json(blogs);
			});
	}
};

// list blogs by user
exports.listByUser = (req, res) => {
	User.findOne({ username: req.params.username }).exec((err, user) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		let userId = user._id;
		Blog.find({ postedBy: userId })
			.populate("categories", "_id name slug")
			.populate("tags", "_id name slug")
			.populate("postedBy", "_id name username")
			.select("_id title slug postedBy createdAt updatedAt")
			.exec((err, data) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}
				res.json(data);
			});
	});
};
