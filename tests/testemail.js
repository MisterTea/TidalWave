var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
transporter.sendMail({
    from: 'cl-tidalwave-mailer@apple.com',
    to: 'jjg@apple.com',
    subject: 'hello',
    text: 'hello world!'
});
