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
        if (err) cb(err);
        console.log('job on %s is drained', search_item);
        cb();
    });
};

const queue = jobs(db, worker, options);


const gen_list = (query, limit) => {
    /*
    const search = cp.spawn("torsocks",
                            ["-i",
                             "ytsearch" + limit + ":" + query,
                             "-j"]);
    const search = cp.spawn("youtube-dl",
                            ["ytsearch" + limit + ":" + query,
                             "-j",
                             "--proxy",
                             "socks5://127.0.0.1:9050"]);
     */

    const search = cp.spawn("youtube-dl",
                            ["ytsearch" + limit + ":" + query,
                             "-j"]);
    return search.stdout;
};

const find_va = (info) => {
    // in this function we try to find best video and audio from info.formats,
    // now that I come to think about it, ffprobe would tke a long time to 
    // parse a big file instead of a small file, it might make sense to download
    // the smallest possible video 
    const worst_video = info.formats.filter(x => x.acodec === 'none')[0].url;
    const worst_audio = info.formats.filter(x => x.vcodec === 'none')[0].url;
    return {video_url: worst_video,
            audio_url: worst_audio};
};

const parse_data = function(chunk,cb) {
    try {
        let info = JSON.parse(chunk.toString());
        console.log('parsing %s', info.id);
        let res_json = find_va(info); 
        res_json.tags = info.tags;
        res_json.categories = info.categories;
        res_json.duration = info.duration;
        res_json.id = info.display_id;
        res_json.info = info;
        info.tags.map(tag => {
            queue.push(tag);
        });
        video_queue.push(res_json);
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
            console.log(err);
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
    console.log('i am retrying!');
});

queue.on('error', function(err) {
    console.log(err);
});

exports.pipeline = pipeline;
exports.queue = queue;
