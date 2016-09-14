const cp = require('child_process');
const through = require('through2');
const util = require('util');
const settings = require('./settings');
const fs = require('fs');
const JSONStream = require('JSONStream');

const kue = require('kue');
const queue = kue.createQueue();

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
            queue.create('crawl', tag); 
        });
        queue.create('video', res_json);
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
            if ((err instanceof SyntaxError) ||
                (err instanceof TypeError)) {
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
