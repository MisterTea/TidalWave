var options = require('./options-handler').options;

var bunyan = require('bunyan');
var log = bunyan.createLogger(
  {
    name: "TidalWave",
    src: true,
    streams: [
      {
        level: options['logging']['level'],
        stream: process.stdout
      },
      {
        level: options['logging']['level'],
        type: 'rotating-file',
        path: options['logging']['file'],
        period: '1d',   // daily rotation
        count: 7        // keep <n> back copies
      }
    ]
  }
);

exports.log = log;
