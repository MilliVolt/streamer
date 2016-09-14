const cp = require('child_process');
const through = require('through2');
const util = require('util');
const settings = require('./settings');
const fs = require('fs');
const JSONStream = require('JSONStream');

const level = require('level');
const jobs = require('level-jobs');

const db = level('jobs/craw');

const options = {
  maxConcurrency: 3,
  maxRetries:     2,
  backoff: {
    randomisationFactor: 0,
    initialDelay: 10,
    maxDelay: 300
  }
};

const video_queue = require('./video').queue;

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
        console.log('parsing %s', info.id);
        info.tags.map(tag => {
            queue.push(tag);
        });
        video_queue.push(info);
    } catch(e) {
        console.log('err');
        console.log(e);
        cb(e);
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
            if (err instanceof SyntaxError ||
                err instanceof TypeError) {
                // if it's ill defined json, don't care
                console.log(err.message);
                cb();
            }
            cb(err);
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
