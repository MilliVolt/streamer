const cp = require('child_process');
const through = require('through2');
const util = require('util');
const settings = require('./settings');
const fs = require('fs');
const JSONStream = require('JSONStream');

const kue = require('kue');
const queue = kue.createQueue();

const video_queue = require('./video').queue;

const OverDurationError = require('./error').OverDurationError;

const worker = function(search_item, cb) {
    //console.log("job started crawling term: %s", search_item);
    pipeline(search_item, 10, function(err) {
        console.log(cb);
        if (err) cb(err);
        console.log('job on %s is drained', search_item);
        cb();
    });
};

const queue = jobs(db, worker, options);


const gen_list = (query, limit) => {
    const search = cp.spawn("youtube-dl",
                            ["ytsearch" + limit + ":" + query,
                             "-j"]);
    return search.stdout;
};

const parse_data = function(chunk,cb) {
    try {
        let info = JSON.parse(chunk.toString());
        if (info.duration > 900) { 
            // over 15 minute video need not be considered
            throw new OverDurationError(
                util.format('%s exceeds 15 minutes limit at %s .. skip',
                            info.id, info.duration/60));
        }
        console.log('parsing %s', info.id);
        info.tags.map(tag => {
            queue.create('crawl', tag); 
        });
        queue.create('video', res_json);
    } catch(e) {
        if (e instanceof OverDurationError) {
            console.log(e.message);
            cb();
        } else { 
            console.log('err');
            console.log(e.message);
            cb();
        }
    }
};

var pipeline = (tag, lim, cb) => {
    //console.log('now search for the %s best list of %s', lim, tag);
    gen_list(tag, lim)
        .on('data', function(data) {
            parse_data(data, cb);
        })
        .on('error', (err) => {
            //console.log('error');
            if ((err instanceof SyntaxError) ||
                (err instanceof TypeError)) {
                // if it's ill defined json, don't care
                console.log(err.message);
                cb();
            }
            cb();
        })
        .on('close', function() {
            console.log('stream on %s ended', tag);
            cb(null);
        })
        ;
};

//queue.push('fixed gear bike');

queue.on('retry', function(d) {
    //console.log('i am retrying! ', ...arguments);
});

queue.on('error', function(err) {
    console.log(err);
});

exports.pipeline = pipeline;
exports.queue = queue;
