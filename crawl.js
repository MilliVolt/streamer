const cp = require('child_process');
const through = require('through2');
const util = require('util');
const settings = require('./settings');
const fs = require('fs');
const queue = require('./queue');
const hash = require('./hash');

const OverDurationError = require('./error').OverDurationError;

const gen_list = (query, limit) => {
    const search = cp.spawn("youtube-dl",
                            ["ytsearch" + limit + ":" + query,
                             "-j"]);
    return search.stdout;
};


const parse_data = function(chunk,cb) {
    try {
        let info = JSON.parse(chunk);
        if (info.duration > 900) { 
            // over 15 minute video need not be considered
            throw new OverDurationError(
                util.format('%s exceeds 15 minutes limit at %s .. skip',
                            info.id, info.duration/60));
        }
        console.log('parsing %s: %s', info.id, info.title);
        info.tags.map(tag => {
            hash.crawl.get(tag, (err, status) => {
                if (err && err.type === 'NotFoundError') {
                    queue.create('crawl', {
                        title: util.format('querying %s', tag),
                        search_term: tag
                    }).save(); 
                    hash.crawl.put(tag, 'pending');
                    console.log(util.format('adding %s to queue', tag));
                } else {
                    console.log(util.format("%s already searched", tag));
                }
            });
        });
        hash.video.get(info.id, (err, status) => {
            if (err && err.type === 'NotFoundError') {
                queue.create('video', {
                    title: util.format('processing youtube id %s', info.id),
                    res_json: info
                }).save();
                hash.video.put(info.id, 'pending');
            } else {
                console.log(util.format("%s already searched", info.id));
            }
        });
    } catch(e) {
        if (e instanceof OverDurationError ||
            e instanceof SyntaxError ||
            e instanceof TypeError) {
            console.log(e.message);
            return;
        } else { 
            console.log('err');
            console.log(e.message);
            return;
        }
    }
};

const pipeline = (tag, lim, cb) => {
    console.log('now search for the %s best list of %s', lim, tag);
    gen_list(tag, lim)
        .on('data', function(data) {
            parse_data(data, cb);
        })
        .on('error', (err) => {
            //console.log('error');
            if ((err instanceof SyntaxError) ||
                (err instanceof TypeError)) {
                // if it's ill defined json, don't care
                    //
                console.log(err.message);
                cb();
            }
            cb();
        })
        .on('close', function() {
            console.log('stream on %s ended', tag);
            cb();
        });
};

queue.process('crawl', settings.crawl_concur, function(job, cb) {
    pipeline(job.data.search_term, 10, function(err) {
        if (err) return cb(err);
        cb();
    });
});
