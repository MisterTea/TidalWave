var options = require('./options-handler').options;
var log = require('./logger').log;
var nodemailer = require('nodemailer');
var directTransport = require('nodemailer-direct-transport');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter;

if (options.email.transport == 'direct') {
  transporter = nodemailer.createTransport(directTransport(options.email.options));
} else if(options.email.transport == 'smtp') {
  transporter = nodemailer.createTransport(smtpTransport(options.email.options));
}

exports.sendMail = function(to,subject,html) {
  log.info({
    message:"Sending email",
    from:options.email.serverEmailAddress,
    to:to,
    subject:subject,
    html:html});
  transporter.sendMail({
    from: options.serverEmailAddress,
    to: to,
    subject: subject,
    html: html
  }, function(error, info) {
    if(error){
        log.error({message:"Mail error",error:error});
    }else{
        log.info({message:'Mail sent',info:info});
    }
  });
};
