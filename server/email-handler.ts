/// <reference path='../typings/node/node.d.ts' />

var nodemailer = require('nodemailer');
var directTransport = require('nodemailer-direct-transport');
var smtpTransport = require('nodemailer-smtp-transport');

import options = require('./options-handler');
import log = require('./logger');

var transporter;

if (options.email.transport == 'direct') {
  transporter = nodemailer.createTransport(directTransport(options.email.options));
} else if(options.email.transport == 'smtp') {
  transporter = nodemailer.createTransport(smtpTransport(options.email.options));
}

export var sendMail = function(to,subject,html) {
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
