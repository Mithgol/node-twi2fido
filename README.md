[![(a histogram of downloads)](https://nodei.co/npm-dl/twi2fido.png?height=3)](https://npmjs.org/package/twi2fido)

This application (`twi2fido`) aggregates microblog entries from Twitter and then prepares them for being posted to Fidonet. (Its name is derived from loosely abbreviated words “tweet to Fido”.)

This application is written in JavaScript and requires [Node.js](http://nodejs.org/) to run. (Node.js version 0.10.x or 0.12.x is recommended. The latest stable [io.js](https://iojs.org/) is fine too.)

## Installing twi2fido

[![(npm package version)](https://nodei.co/npm/twi2fido.png?downloads=true&downloadRank=true)](https://npmjs.org/package/twi2fido)

### Installing as a global application

* Latest packaged version: `npm install -g twi2fido`

* Latest githubbed version: `npm install -g https://github.com/Mithgol/node-twi2fido/tarball/master`

The application becomes installed globally and appears in the `PATH`. Then use `twi2fido` command to run the application.

### Installing as a portable application

Instead of the above, download the [ZIP-packed](https://github.com/Mithgol/node-twi2fido/archive/master.zip) source code of the application and unpack it to some directory. Then run `npm install --production` in that directory.

You may now move that directory (for example, on a flash drive) across systems as long as they have the required version of Node.js installed.

Unlike the above (`npm -g`), the application does not appear in the `PATH`, and thus you'll have to run it directly from the application's directory. You'll also have to use `node twi2fido [parameters]` instead of `twi2fido [parameters]`.

## Configuration steps

1. Visit https://apps.twitter.com/ and register an application. (You may use “twi2fido” as the application's name and https://github.com/Mithgol/node-twi2fido/ as its site. The “read only” permissions should suffice because the application does not post anything to Twitter.)

2. Create an access token.

3. Copy `example.config` to `twi2fido.config`. Edit `twi2fido.config`: instead of `XXXXX...` placeholders you should paste the values of `ConsumerKey`, `ConsumerSecret`, `AccessTokenKey`, `AccessTokenSecret` that were assigned by Twitter to your application and token.

## Using twi2fido

You may run the installed application by typing in the command line:

`twi2fido loginName textOutput fileLastRead`

It uses the following parameters:

* `loginName` — the login name (aka screen name) of a microblog in Twitter. That's the name that usually appears after the `@` character in Twitter (or after https://twitter.com/ in URLs). For example, type `twi2fido interfax_news` to get tweets from [@interfax_news](https://twitter.com/interfax_news/).

* `textOutput` — *(optional)* path to an output text file. That is the file where the recent tweets should be written to.
   * If `textOutput` is not given, then the path `loginName.tweets.txt` is used (for the given value of `loginName`).
   * If the path is not absolute, it is treated as relative to the directory where `twi2fido` resides.

* `fileLastRead` — *(optional)* path to a file where the ID of the last read tweet is stored.
   * If `fileLastRead` is not given, then the path `loginName.lastread.txt` is used (for the given value of `loginName`).
   * If the path is not absolute, it is treated as relative to the directory where `twi2fido` resides.
   * If the file (designated by `fileLastRead`) does not exist, then `twi2fido` cannot determine how many last tweets to post. The default number of 50 last tweets is used.

An optional parameter `"--CHRS=CP866 2"` is accepted before or after any of the above parameters. If such parameter is present, `twi2fido` writes tweets in the given encoding instead of the default UTF-8 encoding.
   * Instead of `CP866 2` such parameter can designate any of Level 2 (single-byte) encodings supported by the [FTS-5003.001](http://ftsc.org/docs/fts-5003.001) standard in Fidonet.
   * That single-byte encoding must also be supported by the [`iconv-lite`](https://github.com/ashtuchkin/iconv-lite) module. (Don't worry, most of them are supported.)

The application does one of the following:

* If some tweets (microblog entries) appeared after the tweet that was read last time (that tweet's ID is stored in `fileLastRead`), these tweets become posted to `textOutput`.

* If that file (designated by `fileLastRead`) does not exist, then `twi2fido` cannot determine how many last tweets to post. The default number is used: 50 last tweets are posted to `textOutput`.

* If the microblog is empty or does not contain any entries newer than the last read, then the `textOutput` file is erased.

### Format of the output text

The inner format of `textOutput` tries to follow Twitter's [display requirements](https://dev.twitter.com/overview/terms/display-requirements) satisfying as many rules as possible for the plain text medium of Fidonet.

For each of the tweets,

* the first line contains the author's full name, then screen name (with `@` before it), then the date and time,

* the second line contains the URL of the tweet,

* then the text of the tweet appears.

### Posting the output text to Fidonet

The text in `textOutput` is ready for posting to Fidonet.

However, `twi2fido` does not perform such posting. A multitude of posting tools already exists in Fidonet and the user is free to pick one preferred tool.

For example, users of [HPT](http://husky.sourceforge.net/hpt.html) might use the following command on Windows:

`if exist textOutput hpt post -nf "twi2fido" -s "Tweets" -e "Example.Echotag" -z "twi2fido" -f loc textOutput`

(However, it would be necessary to substitute every `textOutput` with the real full path of the output file.)

## Testing twi2fido

[![(build testing status)](https://img.shields.io/travis/Mithgol/node-twi2fido/master.svg?style=plastic)](https://travis-ci.org/Mithgol/node-twi2fido)

It is necessary to install [JSHint](http://jshint.com/) for testing.

* You may install JSHint globally (`npm install jshint -g`) or locally (`npm install jshint` in the directory of twi2fido).

After that you may run `npm test` (in the directory of twi2fido). Only the JS code errors are caught.

## License

MIT license (see the `LICENSE` file).
