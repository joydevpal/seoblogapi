const Category = require("../models/Category");
const Blog = require("../models/Blog");
const slugify = require("slugify");

exports.create = (req, res) => {
	const { name } = req.body;
	const slug = slugify(name).toLowerCase();
	const category = new Category({ name, slug });
	category.save((err, data) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		res.json(data);
	});
};

exports.list = (req, res) => {
	Category.find({}).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		return res.json(data);
	});
};

exports.read = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Category.findOne({ slug }).exec((err, category) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		//return res.json(category);
		Blog.find({ categories: category })
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
				res.json({ category, blogs: data });
			});
	});
};

exports.remove = (req, res) => {
	const slug = req.params.slug.toLowerCase();
	Category.findOneAndRemove({ slug }).exec((err, data) => {
		if (err) {
			return res.status(400).json({
				error: err
			});
		}
		return res.json({
			message: "Category deleted successfully"
		});
	});
};
