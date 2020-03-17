const Tag = require("../models/Tag");
const Blog = require("../models/Blog");
const slugify = require("slugify");

exports.create = (req, res) => {
	const { name } = req.body;
	const slug = slugify(name).toLowerCase();
	const tag = new Tag({ name, slug });
	tag.save((err, data) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		res.json(data);
	});
};

exports.list = (req, res) => {
	Tag.find({}).exec((err, data) => {
		if (err) {
			res.status(400).json({
				error: err
			});
		}
		return res.json(data);
	});
};

exports.read = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Tag.findOne({ slug }).exec((err, tag) => {
		if (err) {
			res.status(400).json({
				error: err
			});
		}
		// return res.json(tag);
		Blog.find({ tags: tag })
			.populate("categories", "_id name slug")
			.populate("tags", "_id name slug")
			.populate("postedBy", "_id name")
			.select("_id title slug excerpt categories postedBy tags createdAt updatedAt")
			.exec((err, data) => {
				if (err) {
					return res.status(400).json({
						error: err
					});
				}
				res.json({ tag, blogs: data });
			});
	});
};

exports.remove = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Tag.findOneAndRemove({ slug }).exec((err, data) => {
		if (err) {
			res.status(400).json({
				error: err
			});
		}
		return res.json({
			message: "Tag deleted successfully"
		});
	});
};
