var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var cl = require('ciel');
var escapeStringRegExp = require('escape-string-regexp');
var fiunis = require('fiunis');
var iconv = require('iconv-lite');
var isgd = require('isgd');
var moment = require('moment');
var simteconf = require('simteconf');
var twitter = require('twitter');
var unescapeHTML = require('lodash.unescape');
var XRegExp = require('xregexp');

var config = simteconf( path.join(__dirname, 'twi2fido.config') );

var getLastReadFromFile = filename => {
   try {
      var readData = fs.readFileSync(filename, {encoding: 'utf8'});
      if( /^\s*$/.test(readData) ) return null;
      return readData;
   } catch(e) {
      return null;
   }
};

var eraseFile = filename => {
   try {
      fs.unlinkSync(filename);
   } catch(e) {}
};

var limit = 78; // length limit for lines of runes and runewords

var getShortImageRune = (imageURL, linkURL, srcAltText) => {
   var rune;
   var altText = '(image)';
   if( typeof srcAltText === 'string' ) altText = `(${srcAltText})`;

   // step 1, almost always fails
   rune = `[![${altText}](${imageURL})](${linkURL} "zoom")`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   // step 2, almost always works
   rune = `[![${altText}](${imageURL})\n](${linkURL} "zoom")`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   // step 3, should always work
   rune = `[![${altText}\n](${imageURL})\n](${linkURL} "zoom")`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   return null; // URLs too large
};

var getAnimRuneword = mediaURL => {
   var rune; // actually a runeword, but maintaining similarity to the above

   if( typeof mediaURL.video_info !== 'object' ) return null; // source fault
   if( !Array.isArray(mediaURL.video_info.variants) ) return null;
   var zeroVariant = mediaURL.video_info.variants[0];
   if( zeroVariant.content_type !== 'video/mp4' ) return null;
   if( typeof zeroVariant.url !== 'string' ) return null;
   var linkURL = zeroVariant.url;
   if( linkURL.length < 1 ) return null;

   // step 1, almost always fails
   rune = `[(animation)](${linkURL} "runeanim")`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   // step 2, should always work: chunk = linkURL + 2 characters
   rune = `[(animation)\n](${linkURL} "runeanim")`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   return null; // URL too large
};

var getVideoRuneword = (mediaURL, cbRuneword) => {
   var rune; // actually a runeword, but maintaining similarity to the above

   if( typeof mediaURL.video_info !== 'object' ) return cbRuneword(null);
   if( !Array.isArray(mediaURL.video_info.variants) ) return cbRuneword(null);
   var vidVariants = mediaURL.video_info.variants.filter(
      nextVariant => typeof nextVariant.bitrate === 'number'
   );
   if( vidVariants.length < 1 ) return cbRuneword(null);
   var sourceVideoURL = vidVariants.sort(
      (a, b) => b.bitrate - a.bitrate // [0] is to contain the largest bitrate
   )[0].url;
   if( typeof sourceVideoURL !== 'string' ) return cbRuneword(null);
   if( sourceVideoURL.length < 4 ) return cbRuneword(null); // 'ftp:'.length

   isgd.shorten(sourceVideoURL, linkURL => {
      if(
         !linkURL.startsWith('https://is.gd/') &&
         !linkURL.startsWith('http://is.gd/')
      ){
         cl.fail('Cannot shorten ' + sourceVideoURL);
         cl.fail(linkURL); // is likely to contain an error message
         return cbRuneword(null);
      }

      // step 1, might fail (though likely to work because of shortening)
      rune = `[(video)](${linkURL} "runevideo")`;
      if(
         rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
      ) return cbRuneword(rune);

      // step 2, should always work: chunk = linkURL + 2 characters
      rune = `[(video)\n](${linkURL} "runevideo")`;
      if(
         rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
      ) return cbRuneword(rune);

      return cbRuneword(null); // URL too large
   });
};

var cbTweetToContent = (source, sourceText, cbContent) => cbContent(null, [
   source.user.name, ' (@', source.user.screen_name, ') ',
   moment(
      source.created_at,
      'ddd MMM DD HH:mm:ss ZZ YYYY'
   ).utc().format('YYYY-MM-DD HH:mm:ss'),
   ' (UTC)\n\n',
   'https://twitter.com/', source.user.screen_name, '/status/', source.id_str,
   '\n\n',
   sourceText,
   '\n\n\n\n'
].join(''));

module.exports = (loginName, options) => {
   var textOutput   = path.resolve(__dirname, options.textOutput);
   var fileLastRead = path.resolve(__dirname, options.fileLastRead);
   var debugOutput  = path.resolve(__dirname, 'debug.json');

   var spaceIDX = options.CHRS.indexOf(' ');
   if( spaceIDX < 0 ){
      cl.fail(
         `The given charset "${options.CHRS
         }" does not have an <encoding><whitespace><level> form.`
      );
      cl.fail([
         'The standard http://ftsc.org/docs/fts-5003.001',
         ' does not currently recommend it.'
      ].join(''));
      if(!( options.debug )) eraseFile(textOutput);
      process.exit(1);
   }
   var encodingCHRS = options.CHRS.slice(0, spaceIDX);
   if(!( iconv.encodingExists(encodingCHRS) )){
      cl.fail(`The given encoding "${encodingCHRS}" is unknown.`);
      cl.fail([
         'The module https://github.com/ashtuchkin/iconv-lite',
         ' does not support it.'
      ].join(''));
      if(!( options.debug )) eraseFile(textOutput);
      process.exit(1);
   }
   var modeUTF8 = (encodingCHRS === 'UTF-8' || encodingCHRS === 'UTF8');

   var getHashtagRegExp = hashtags => XRegExp([
      '(?:',
      hashtags.map(
         nextHashtag => escapeStringRegExp(nextHashtag)
      ).join('|'),
      ')(?=$|[^\\p{L}])'
   ].join(''), 'gi');

   var twi = new twitter({
      consumer_key:        config.last('ConsumerKey'),
      consumer_secret:     config.last('ConsumerSecret'),
      access_token_key:    config.last('AccessTokenKey'),
      access_token_secret: config.last('AccessTokenSecret')
   });

   var tweeOptions = {
      // include_rts: false, ← can become a future setting!
      count: 100,
      include_ext_alt_text: true,
      screen_name: loginName,
      tweet_mode: 'extended'
   };
   if(!( options.debug )){
      var lastRead = getLastReadFromFile(fileLastRead);
      if( lastRead !== null ) tweeOptions.since_id = lastRead;
   }

   twi.get('statuses/user_timeline', tweeOptions, (err, tweetList) => {
      var lastreadID = null;

      if( err ) throw new Error( util.inspect(err, { depth: null }) );

      if( options.debug ){
         fs.writeFileSync(
            debugOutput, util.inspect(tweetList, { depth: null })
         );
         cl.ok('Debug output has been written: ' + debugOutput);
         process.exit();
      }

      // non-zero length before filtering → lastread update is needed:
      if( tweetList.length > 0 ) lastreadID = tweetList[0].id_str;

      // filtering:
      if( options.hashtags.length > 0 ){
         tweetList = tweetList.filter(nextTweet => {
            // same as in the iterator (see ≈26 lines below):
            var sourceText = unescapeHTML(
               (
                  nextTweet.retweeted_status || nextTweet
               ).full_text
            );

            return getHashtagRegExp(options.hashtags).test(sourceText);
         });
      }

      if( options.counting ){
         if( tweetList.length < 1 ){
            cl.skip('Zero tweets are waiting to be reposted in Fidonet.');
         } else {
            cl.status([
               tweetList.length,
               ' tweet',
               (tweetList.length > 1) ? 's are' : ' is',
               ' waiting to be reposted in Fidonet.'
            ].join(''));
         }
         process.exit();
      }

      // zero length after filtering → nothing to do, immediate exit:
      if( tweetList.length < 1 ){
         // exiting sequence initiated:
         if( lastreadID !== null ) fs.writeFileSync(fileLastRead, lastreadID);

         eraseFile(textOutput);
         cl.skip('Zero tweets received, output file erased.');
         return;
      }

      // the list of microblog entries is not empty → processing:
      tweetList.reverse(); // undo reverse chronological order
      async.map(
         tweetList, // `tweetList` elements → Fidonet message's text portions
         (tweet, cbContent) => {
            // same as in the filter (see ≈26 lines above):
            var source = tweet.retweeted_status || tweet;
            var sourceText = unescapeHTML(source.full_text);

            // expand simple URLs in `sourceText`:
            if(
               typeof source.entities !== 'undefined' &&
               Array.isArray(source.entities.urls)
            ) sourceText = source.entities.urls.reduce((txt, objURL) => {
               if(
                  typeof objURL.url === 'string' &&
                  typeof objURL.expanded_url === 'string' &&
                  objURL.expanded_url.length <= 78
               ) return txt.split(objURL.url).join(objURL.expanded_url);

               return txt;
            }, sourceText);

            if(
               typeof source.extended_entities === 'undefined' ||
               !Array.isArray(source.extended_entities.media)
            ) return cbTweetToContent(source, sourceText, cbContent);
            //(cannot expand media URLs in `sourceText` → nothing else to do)

            // expand media URLs in `sourceText`:
            var arrMediaURLs = source.extended_entities.media;
            async.eachSeries(
               arrMediaURLs,
               (mediaURL, doneMediaURL) => {
                  if(
                     typeof mediaURL.url !== 'string' ||
                     typeof mediaURL.display_url !== 'string' ||
                     ('https://' + mediaURL.display_url).length > 78
                  ) return doneMediaURL(null);
                  // ( cannot do anything with such `mediaURL` )

                  // `HTTPSURL` replaces `mediaURL.url` inside `sourceText`,
                  // though the last `mediaURL.url` can be replaced by rune(s)
                  // later at the end of `sourceText` (see details below):
                  var HTTPSURL = 'https://' + mediaURL.display_url;
                  var frags = sourceText.split(mediaURL.url);
                  if(
                     options.noRunes ||
                     frags.length < 2 || frags[frags.length-1] !== ''
                  ){
                     // either Fidonet runes are disabled,
                     // or the tweet does not end with `mediaURL.url`,
                     // therefore cannot cause rune(s) or a runeword:
                     sourceText = frags.join(HTTPSURL);
                     return doneMediaURL(null);
                  }

                  // create a separator to insert before the final rune(s):
                  var separuner = '\n\n';
                  // and a special case when the tweet contains only rune(s):
                  if( frags.length === 2 && frags[0] === '' ) separuner = '';
                  // ( in that case frags[1] is also '' since the prev check )

                  // detect and render the necessary runes or runewords:
                  if( mediaURL.type === 'photo' ){
                     var imageRunes = arrMediaURLs.filter(nextMediaURL =>
                        nextMediaURL.display_url === mediaURL.display_url
                     ).map(nextMediaURL => getShortImageRune(
                        nextMediaURL.media_url_https,
                        nextMediaURL.media_url_https + ':orig',
                        nextMediaURL.ext_alt_text
                     )).filter(nextRune => nextRune !== null);

                     if( imageRunes.length > 0 ){
                        frags.pop();
                        frags[
                           frags.length-1
                        ] += separuner + imageRunes.join('\n\n');
                     }
                     sourceText = frags.join(HTTPSURL);
                     return doneMediaURL(null);
                  } else if( mediaURL.type === 'animated_gif' ){
                     var animRuneword = getAnimRuneword(mediaURL);
                     if( typeof animRuneword === 'string' ){
                        frags.pop();
                        frags[frags.length-1] += separuner + animRuneword;
                     }
                     sourceText = frags.join(HTTPSURL);
                     return doneMediaURL(null);
                  } else if( mediaURL.type === 'video' ){
                     getVideoRuneword(mediaURL, videoRuneword => {
                        if( typeof videoRuneword === 'string' ){
                           frags.pop();
                           frags[frags.length-1] += separuner + videoRuneword;
                        }
                        sourceText = frags.join(HTTPSURL);
                        return doneMediaURL(null);
                     });
                  } else { // unknown mediaURL type, nothing to do:
                     sourceText = frags.join(HTTPSURL);
                     return doneMediaURL(null);
                  }
               },
               err => {
                  if( err ) return cbContent(err);

                  return cbTweetToContent(source, sourceText, cbContent);
               }
            );
         }, // converted `tweetList` to portions of Fidonet message's content
         (err, arrContent) => {
            if( err ) throw err;

            // add an empty line “after kludges” (though they're added later):
            var content = '\u00A0\n' + arrContent.join('');

            twi.get( // trying to get an avatar for the corresponding kludge
               'users/show',
               { screen_name: loginName },
               (err, userdata) => {
                  if(
                     !err &&
                     typeof userdata.profile_image_url_https === 'string'
                  ){
                     content = [
                        '\x01AVATAR: ',
                        userdata.profile_image_url_https.replace(
                           /_normal\.(jpe?g|png|gif|svg|webp)$/,
                           '.$1'
                        ),
                        '\n',
                        content
                     ].join('');
                  }
                  content = `\x01CHRS: ${options.CHRS
                     }\n\x01SOURCESITE: Twitter\n${content}`;
                  if( !modeUTF8 ) content = fiunis.encode(
                     content, encodingCHRS
                  );
                  fs.writeFileSync(textOutput, content);

                  // everything is OK → exiting sequence initiated:
                  if(
                     lastreadID !== null
                  ) fs.writeFileSync(fileLastRead, lastreadID);
                  cl.ok([
                     tweetList.length,
                     ' tweet',
                     (tweetList.length > 1) ? 's' : '',
                     ' written.'
                  ].join(''));
               }
            );
         }
      );
   });
};