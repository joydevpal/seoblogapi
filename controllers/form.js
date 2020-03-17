const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.contactForm = (req, res) => {
	const { name, email, message } = req.body;

	const emailData = {
		to: process.env.EMAIL_TO,
		from: email,
		subject: `Contact form - ${process.env.APP_NAME}`,
		text: `Email received from contact form \n Sender name: ${name} \n Sender email: ${email} \n Sender Message: ${message}`,
		html: `
			<h4>Email Received from contact form</h4>
			<p>Sender Name: ${name}</p>
			<p>Sender Email: ${email}</p>
			<p>Sender Message: ${message}</p>
			<hr />
			<p>This email may contain sensitive information</p>
			<p>https://seoblog.com</p>
		`
	};
	sgMail
		.send(emailData)
		.then(sent => {
			return res.json({
				success: true
			});
		})
		.catch(err => {
			console.log(err);
		});
};

//
exports.contactBlogAuthorForm = (req, res) => {
	const { authorEmail, name, email, message } = req.body;

	const mailList = [authorEmail, process.env.EMAIL_TO];

	const emailData = {
		to: process.env.EMAIL_TO,
		from: email,
		subject: `Someone Message you from ${process.env.APP_NAME}`,
		text: `Email received from contact form \n Sender name: ${name} \n Sender email: ${email} \n Sender Message: ${message}`,
		html: `
			<h4>Message Received from:</h4>
			<p>Name: ${name}</p>
			<p>Email: ${email}</p>
			<p>Message: ${message}</p>
			<hr />
			<p>This email may contain sensitive information</p>
			<p>https://seoblog.com</p>
		`
	};
	sgMail
		.send(emailData)
		.then(sent => {
			return res.json({
				success: true
			});
		})
		.catch(err => {
			console.log(err);
		});
};
