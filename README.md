[![(a histogram of downloads)](https://nodei.co/npm-dl/twi2fido.png?height=3)](https://npmjs.org/package/twi2fido)

This application (`twi2fido`) aggregates microblog entries from Twitter and then posts them to Fidonet. (Its name is derived from loosely abbreviated words “tweet to Fido”.)

This application is written in JavaScript and requires [Node.js](http://nodejs.org/) to run. (Node.js version 0.10.x or 0.12.x is recommended. The latest stable [io.js](https://iojs.org/) is fine too.)

This application is currently in an early phase of its development and thus does not have the desired level of feature completeness.

## Installing the application

[![(npm package version)](https://nodei.co/npm/twi2fido.png?downloads=true&downloadRank=true)](https://npmjs.org/package/twi2fido)

### Installing as a global application

* Latest packaged version: `npm install -g twi2fido`

* Latest githubbed version: `npm install -g https://github.com/Mithgol/twi2fido/tarball/master`

The application becomes installed globally and appears in the `PATH`. Then use `twi2fido` command to run the application.

### Installing as a portable application

Instead of the above, download the [ZIP-packed](https://github.com/Mithgol/twi2fido/archive/master.zip) source code of the application and unpack it to some directory. Then run `npm install --production` in that directory.

You may now move that directory (for example, on a flash drive) across systems as long as they have the required version of Node.js installed.

Unlike the above (`npm -g`), the application does not appear in the `PATH`, and thus you'll have to run it directly from the application's directory. You'll also have to use `node twi2fido [parameters]` instead of `twi2fido [parameters]`.

## Configuration steps

1. Visit https://apps.twitter.com/ and register an application. (You may use “twi2fido” as the application's name and https://github.com/Mithgol/node-twi2fido/ as its site. The “read only” permissions should suffice because the application does not post anything to Twitter.)

2. Create an access token.

3. Copy `example.config` to `twi2fido.config`. Edit `twi2fido.config`: instead of `XXXXX...` placeholders you should paste the values of `ConsumerKey`, `ConsumerSecret`, `AccessTokenKey`, `AccessTokenSecret` that were assigned by Twitter to your application and token.

## License

MIT license (see the `LICENSE` file).
