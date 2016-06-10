var fs = require('fs');
var path = require('path');
var util = require('util');
var cl = require('ciel');
var escapeStringRegExp = require('escape-string-regexp');
var fiunis = require('fiunis');
var iconv = require('iconv-lite');
var moment = require('moment');
var simteconf = require('simteconf');
var twitter = require('twitter');
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

var getShortImageRune = (imageURL, linkURL, srcAltText) => {
   var limit = 78; // limit of `shortAltText` plus `'[![()'.length`
   var rune;
   var altText = '(image)';
   if( typeof srcAltText === 'string' ) altText = `(${srcAltText})`;

   // step 1, almost always fails
   rune = `[![${altText}](${imageURL})](${linkURL})`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   // step 2, almost always works
   rune = `[![${altText}](${imageURL})\n](${linkURL})`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   // step 3, should always work
   rune = `[![${altText}\n](${imageURL})\n](${linkURL})`;
   if(
      rune.split(/[ \n]/).every( chunk => chunk.length <= limit )
   ) return rune;

   return null; // URLs too large
};

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
      count: 80,
      include_ext_alt_text: true,
      screen_name: loginName
   };
   if(!( options.debug )){
      var lastRead = getLastReadFromFile(fileLastRead);
      if( lastRead !== null ) tweeOptions.since_id = lastRead;
   }

   twi.get('statuses/user_timeline', tweeOptions, (err, tweetList) => {
      if( err ) throw new Error( util.inspect(err, { depth: null }) );

      if( options.debug ){
         fs.writeFileSync(
            debugOutput, util.inspect(tweetList, { depth: null })
         );
         cl.ok('Debug output has been written: ' + debugOutput);
         process.exit();
      }
      if( tweetList.length > 0 ){ // length before filtering
         fs.writeFileSync(fileLastRead, tweetList[0].id_str);
      }

      if( options.hashtags.length > 0 ){
         tweetList = tweetList.filter(function(nextTweet){
            // same as in the iterator below:
            var sourceText = ( nextTweet.retweeted_status || nextTweet ).text;

            return getHashtagRegExp(options.hashtags).test(sourceText);
         });
      }
      if( tweetList.length < 1 ){ // length after filtering
         eraseFile(textOutput);
         cl.skip('Zero tweets received, output file erased.');
         return;
      }
      tweetList.reverse(); // undo reverse chronological order
      var content = tweetList.reduce((prevContent, tweet) => {
         // same as in the filter above:
         var source = tweet.retweeted_status || tweet;
         var sourceText = source.text;

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

         // expand media URLs in `sourceText`:
         if(
            typeof source.extended_entities !== 'undefined' &&
            Array.isArray(source.extended_entities.media)
         ) sourceText = source.extended_entities.media.reduce(
            (txt, mediaURL, mediaIDX, arrMediaURLs) => {
               if(
                  typeof mediaURL.url === 'string' &&
                  typeof mediaURL.display_url === 'string' &&
                  ('https://' + mediaURL.display_url).length <= 78
               ){
                  var HTTPSURL = 'https://' + mediaURL.display_url;
                  var frags = txt.split(mediaURL.url);
                  if(
                     frags.length > 1 &&
                     frags[frags.length-1] === '' &&
                     mediaURL.type === 'photo'
                  ){
                     var imageRunes = arrMediaURLs.filter(nextMediaURL =>
                        nextMediaURL.display_url === mediaURL.display_url
                     ).map(nextMediaURL => getShortImageRune(
                        nextMediaURL.media_url_https, HTTPSURL,
                        nextMediaURL.ext_alt_text
                     )).filter(nextRune => nextRune !== null);

                     if( imageRunes.length > 0 ){
                        frags.pop();
                        var separuner = '\n\n';
                        if(
                           frags.length === 1 && frags[0] === ''
                        ) separuner = '';
                        frags[frags.length-1] += separuner + imageRunes.join(
                           '\n\n'
                        );
                     }
                  }
                  return frags.join(HTTPSURL);
               } else return txt;
            },
            sourceText
         );

         return prevContent + [
            source.user.name,
            ' (@',
            source.user.screen_name,
            ') ',
            moment(
               source.created_at,
               'ddd MMM DD HH:mm:ss ZZ YYYY'
            ).utc().format('YYYY-MM-DD HH:mm:ss'),
            ' (UTC)\n\n',
            'https://twitter.com/',
            source.user.screen_name,
            '/status/',
            source.id_str,
            '\n\n',
            sourceText,
            '\n\n\n\n'
         ].join('');
      }, ''); // tweetList.reduce conversion to `content` finished

      twi.get('users/show', {screen_name: loginName}, (err, userdata) => {
         content = '\u00A0\n' + content;
         if( !err && typeof userdata.profile_image_url_https === 'string' ){
            content = [
               '\x01AVATAR: ',
               userdata.profile_image_url.replace(
                  /_normal\.(jpe?g|png|gif|svg|webp)$/,
                  '.$1'
               ),
               '\n',
               content
            ].join('');
         }
         content = `\x01CHRS: ${options.CHRS
            }\n\x01SOURCESITE: Twitter\n${content}`;
         if( !modeUTF8 ) content = fiunis.encode(content, encodingCHRS);
         fs.writeFileSync(textOutput, content);
         cl.ok([
            tweetList.length,
            ' tweet',
            (tweetList.length > 1)? 's' : '',
            ' written.'
         ].join(''));
      });
   });
};