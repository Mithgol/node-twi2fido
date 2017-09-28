[![(a histogram of downloads)](https://nodei.co/npm-dl/twi2fido.png?height=3)](https://npmjs.org/package/twi2fido)

This application (`twi2fido`) aggregates microblog entries from Twitter and then prepares them for being posted to Fidonet. (Its name is derived from loosely abbreviated words “tweet to Fido”. It does not imply any endorsement, sponsorship, or association with Twitter.)

This application is written in JavaScript and requires [Node.js](http://nodejs.org/) to run.
   * Starting from v2.0.0, this module requires Node.js version 4.0.0 (or newer) because it is rewritten in ECMAScript 2015 (ES6). Previous versions of Node.js (v0.10.x, v0.12.x) are themselves not maintained by their developers after 2016-12-31.

Starting from v2.5.4, this application understands the “extended” version of tweets that has been introduced in the announcements “[Coming soon: express even more in 140 characters](https://blog.twitter.com/express-even-more-in-140-characters)” and “[Doing more with 140 characters](https://blog.twitter.com/2016/doing-more-with-140-characters)” in 2016. The same changes in the source code are apparently enough to also support the doubled limit (280 characters) that has been introduced in the announcement “[Giving you more characters to express yourself](https://blog.twitter.com/official/en_us/topics/product/2017/Giving-you-more-characters-to-express-yourself.html)” in 2017.

## Installing twi2fido

[![(npm package version)](https://nodei.co/npm/twi2fido.png?downloads=true&downloadRank=true)](https://npmjs.org/package/twi2fido)

### Installing as a global application

* Latest packaged version: `npm install -g twi2fido`

* Latest githubbed version: `npm install -g https://github.com/Mithgol/node-twi2fido/tarball/master`

The application becomes installed globally and appears in the `PATH`. Then use `twi2fido` command to run the application.

### Installing as a portable application

Instead of the above, download the [ZIP-packed](https://github.com/Mithgol/node-twi2fido/archive/master.zip) source code of the application and unpack it to some directory. Then run `npm install --production` in that directory.

You may now move that directory (for example, on a flash drive) across systems as long as they have the required version of Node.js installed.

Unlike the above (`npm -g`), the application does not appear in the `PATH`, and thus you'll have to run it directly from the application's directory. You'll also have to run `node twi2fido [parameters]` instead of `twi2fido [parameters]`.

## Configuration

It is necessary to configure `twi2fido` before you run it. (For example, you cannot use [`npx`](https://github.com/zkat/npx) to run `npx twi2fido` without having to install `twi2fido` permanently.) You can configure `twi2fido` in three simple steps:

1. Visit https://apps.twitter.com/ and register an application. (You may use “twi2fido” as the application's name and https://github.com/Mithgol/node-twi2fido/ as its site. The “read only” permissions should suffice because the application does not post anything to Twitter.)

2. Create an access token.

3. Copy `example.config` to `twi2fido.config`. Edit `twi2fido.config`: instead of `XXXXX...` placeholders you should paste the values of `ConsumerKey`, `ConsumerSecret`, `AccessTokenKey`, `AccessTokenSecret` that were assigned by Twitter to your application and token.

## Using twi2fido

You may run the configured application by typing in the command line:

`twi2fido loginName textOutput fileLastRead`

It uses the following parameters:

* `loginName` — the login name (aka screen name) of a microblog in Twitter. That's the name that usually appears after the `@` character in Twitter (or after https://twitter.com/ in URLs). For example, type `twi2fido interfax_news` to get tweets from [@interfax_news](https://twitter.com/interfax_news/).

* `textOutput` — *(optional)* path to an output text file. That is the file where the recent tweets should be written to.
   * If `textOutput` is not given, then the path `loginName.tweets.txt` is used (for the given value of `loginName`).
   * If the path is not absolute, it is treated as relative to the directory where `twi2fido` resides.

* `fileLastRead` — *(optional)* path to a file where the ID of the last read tweet is stored.
   * If `fileLastRead` is not given, then the path `loginName.lastread.txt` is used (for the given value of `loginName`).
   * If the path is not absolute, it is treated as relative to the directory where `twi2fido` resides.
   * If the file (designated by `fileLastRead`) does not exist, then `twi2fido` cannot determine how many last tweets to post. The default maximum of 100 last tweets is used.

An optional parameter `"--CHRS=CP866 2"` is accepted before or after any of the above parameters. If such parameter is present, `twi2fido` writes tweets in the given encoding instead of the default UTF-8 encoding.
   * Instead of `CP866 2` such parameter can designate any of Level 2 (single-byte) encodings supported by the [FTS-5003.001](http://ftsc.org/docs/fts-5003.001) standard in Fidonet.
   * That single-byte encoding must also be supported by the [`iconv-lite`](https://github.com/ashtuchkin/iconv-lite) module. (Don't worry, most of them are supported.)
   * The corresponding `CHRS` kludge is added to the output message exactly as the [FTS-5003.001](http://ftsc.org/docs/fts-5003.001) standard dictates.
   * Where a character or a sequence of characters from a tweet cannot be represented in the designated encoding (for example, East Asian character “魔” in Russian CP866 encoding), a [Fidonet Unicode substring](https://github.com/Mithgol/fiunis) is created to represent such characters.

An optional parameter `"--hashtag=..."` parameter is accepted before or after any of the above parameters. If such parameter is present, `twi2fido` writes only the tweets that contain at least one of the given hashtags. Several hashtags (separated by commas) may be given. (Example: `--hashtag=anime,manga,vn`.) The character `#` is optional before hashtags (it'll be added automatically if omitted in the command line).

An optional parameter `"--debug"` is accepted before or after any of the above parameters. If such parameter is present, `twi2fido` does not write tweets to disk (and neither reads nor updates `fileLastRead`) and instead writes raw JSON from Twitter (of the desinated `loginName`) to the file `debug.json` in the directory where `twi2fido` resides.

The application does one of the following:

* If some tweets (microblog entries) appeared after the tweet that was read last time (that tweet's ID is stored in `fileLastRead`), these tweets become posted to `textOutput`. The default maximum (100 tweets) is enforced: only the latest 100 tweets are posted if more than 100 tweets appeared after the tweet that was read last time.

* If that file (designated by `fileLastRead`) does not exist, then `twi2fido` cannot determine how many last tweets to post. The default maximum is used: 100 last tweets are posted to `textOutput`.

* If the microblog is empty or does not contain any entries newer than the last read, then the `textOutput` file is erased.

### Format of the output text

The inner format of `textOutput` tries to follow Twitter's [display requirements](https://dev.twitter.com/overview/terms/display-requirements) satisfying as many rules as possible for the plain text medium of Fidonet.

For each of the tweets,

* the first line contains the author's full name, then screen name (with `@` before it), then the date and time,

* the second line contains the URL of the tweet,

* then the text of the tweet appears.

In the text of the tweet,

* short `t.co` URLs are conveted back to long original URLs (unless they were longer than 78 characters),

* if a picture or several pictures are attached to the tweet, then they are displayed after the text of the tweet (instead of their short `t.co` URL), separated by single empty lines. Each picture is represented by a Fidonet Rune of a hyperlink:
   * The hyperlink leads to the picture in its “original” form. It should be mostly the same as the tweet's author's original uploaded file (except that Twitter [removes Exif data](https://support.twitter.com/articles/20156423) to anonymize the equipment and the geographical location). That file can be huge (many megabytes and many megapixels) and that's why it is made a hyperlink's target (does not directly appear directly in Fidonet) to save traffic and efforts of Fidonet readers and Twitter servers.
   * The hyperlink's anchor is the picture in its default (Twitter-defined) resolution. As of March 2017, Twitter used “medium” pictures (resized to fit in 1200×1200 pixels).
   * [Image descriptions](https://blog.twitter.com/2016/accessible-images-for-everyone) are used as alternative texts of images; if a description is not provided, a mere word “image” is used. Parentheses are added around alternative texts to distinguish them from normal text.
   * The hyperlink's title is the word “zoom”.
   * Additional linebreaks are automatically inserted (where necessary) to ensure that each line of the rune is not longer than 78 characters.

Three empty lines separate individual tweets from each other.

#### Kludges

The output text is prepended by the following Fidonet kludges:

* The `CHRS` kludge specifying the encoding charset (see above), given by the `"--CHRS=..."` parameter (or UTF-8 charset by default). Adheres to the [FTS-5003.001](http://ftsc.org/docs/fts-5003.001) standard.

* The `AVATAR` kludge containing the URL of the avatar of the given Twitter's user. Adheres to the Fidonet avatars' standard (see the [Fidonet JAM](https://github.com/Mithgol/node-fidonet-jam) repository).

* The `SOURCESITE: Twitter` kludge (i.e. the kludge `SOURCESITE` with the value `Twitter`). There is no corresponding standard, but such a mark might help to prevent reposts (back to Twitter) by applications that post messages to the opposite direction (from Fidonet to Twitter).

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

After that you may run `npm test` (in the directory of twi2fido). Only the JS code errors are caught; the code's behaviour is not tested.

## See also

The package [`fido2twi`](https://github.com/Mithgol/node-fido2twi) posts Fidonet messages to Twitter. It's a useful counterpart to `twi2fido`.

## License

MIT license (see the `LICENSE` file).
