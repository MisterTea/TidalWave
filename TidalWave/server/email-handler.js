var nodemailer = require('nodemailer');
var directTransport = require('nodemailer-direct-transport');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(directTransport({
  debug:true
}));
/*
var transporter = nodemailer.createTransport(smtpTransport({
  host:"mail.apple.com",
  port:587,
  authMethod:"PLAIN",
  auth: {
    user:'jgauci',
    pass:'Naaf9264!'
  }
}));
*/
var options = require('./options-handler').options;
var log = require('./logger').log;

exports.sendMail = function(to,subject,html) {
  log.info({
    message:"Sending email",
    from:options.serverEmailAddress,
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
