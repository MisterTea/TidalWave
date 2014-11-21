var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport();
var options = require('./options-handler').options;

exports.sendMail = function(to,subject,text) {
  transporter.sendMail({
    from: options.serverEmailAddress,
    to: to,
    subject: subject,
    text: text
  });
};
