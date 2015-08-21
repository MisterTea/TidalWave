/// <reference path='../typings/node/node.d.ts' />
/// <reference path='../typings/mongodb/mongodb.d.ts' />
/// <reference path='../typings/express/express.d.ts' />

var bunyan = require('bunyan');

import options = require('./options-handler');

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

export = log;
