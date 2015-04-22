#!/usr/bin/env node

var twi2fido = require('./t2f-core.js');
var clog = console.log;

var loginName, textOutput, fileLastRead;

if( process.argv.length < 3 ){
   clog('Usage:');
   clog('   twi2fido loginName textOutput fileLastRead');
   clog('');
   clog('Parameters:');
   clog('');
   clog('loginName    -- login name (screen name) of a microblog in Twitter');
   clog('');
   clog('textOutput   -- (optional) path to an output text file');
   clog('                where the recent tweets should be written to.');
   clog('                (By default, loginName.tweets.txt.)');
   clog('');
   clog('fileLastRead -- (optional) path to a file where the ID');
   clog('                of the last read tweet will be stored.');
   clog('                (By default, loginName.lastread.txt.)');
} else if (process.argv.length == 3) {
   loginName    = process.argv[2];
   textOutput   = loginName + '.tweets.txt';
   fileLastRead = loginName + '.lastread.txt';
} else if (process.argv.length == 4) {
   loginName    = process.argv[2];
   textOutput   = process.argv[3];
   fileLastRead = loginName + '.lastread.txt';
} else if (process.argv.length > 4) {
   loginName    = process.argv[2];
   textOutput   = process.argv[3];
   fileLastRead = process.argv[4];
}

twi2fido(loginName, textOutput, fileLastRead);
