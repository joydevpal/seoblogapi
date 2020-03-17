const mongoose = require("mongoose");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			trim: true,
			required: true,
			unique: true,
			lowercase: true,
			max: 32,
			index: true
		},
		name: {
			type: String,
			trim: true,
			required: true,
			max: 32
		},
		email: {
			type: String,
			trim: true,
			required: true,
			unique: true,
			lowercase: true
		},
		profile: {
			type: String,
			required: true
		},
		hashed_password: {
			type: String,
			required: true
		},
		salt: {
			type: String
		},
		about: {
			type: String
		},
		role: {
			type: Number,
			default: 0
		},
		photo: {
			data: Buffer,
			contentType: String
		},
		resetPasswordLink: {
			type: String,
			default: ""
		}
	},
	{ timestamps: true }
);

UserSchema.virtual("password")
	.set(function(password) {
		// create temporary password
		this._password = password;
		// create salt
		this.salt = this.makeSalt();
		// encryptPassword
		this.hashed_password = this.encryptPassword(password);
	})
	.get(function() {
		return this._password;
	});

UserSchema.methods = {
	authenticate: function(plainText) {
		return this.encryptPassword(plainText) === this.hashed_password;
	},
	encryptPassword: function(password) {
		if (!password) return "";
		try {
			return crypto
				.createHmac("sha1", this.salt)
				.update(password)
				.digest("hex");
		} catch (err) {
			return "";
		}
	},
	makeSalt: function() {
		return Math.round(new Date().valueOf() * Math.random()) + "";
	}
};

module.exports = mongoose.model("User", UserSchema);
