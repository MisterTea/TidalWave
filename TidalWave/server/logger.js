var bunyan = require('bunyan');
var log = bunyan.createLogger(
  {
    name: "TidalWave",
    src: true,
    streams: [
      {
        level: 'debug',
        stream: process.stdout
      },
      {
        level: 'debug',
        type: 'rotating-file',
        path: './outputlog.json',
        period: '1d',   // daily rotation
        count: 7        // keep <n> back copies
      }
    ]
  }
);

exports.log = log;

