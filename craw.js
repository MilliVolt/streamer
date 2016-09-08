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
  maxConcurrency: 10,
  maxRetries:     2,
  backoff: {
    randomisationFactor: 0,
    initialDelay: 10,
    maxDelay: 300
  }
};

const video_queue = require('./video_queue').queue;

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

const find_best_va = (info) => {
    // in this function we try to find best video and audio from info.formats,
    // now that I come to think about it, ffprobe would tke a long time to 
    // parse a big file instead of a small file, it might make sense to download
    // the smallest possible video 
    // TODO: possibly do smaller video
    const re = /^([0-9][0-9][0-9])\+([0-9][0-9][0-9])$/g;
    const regex_res = re.exec(info.format_id);
    const vid = regex_res[1];
    const aid = regex_res[2];
    const v_url = info.formats.filter(x => x.format_id === vid)[0].url;
    const a_url = info.formats.filter(x => x.format_id === aid)[0].url;
    return {video_url: v_url,
            audio_url: a_url};
};

const parse_data = function(chunk,cb) {
    try {
        let info = JSON.parse(chunk.toString());
        console.log('parsing %s', info.id);
        let res_json = find_best_va(info); 
        res_json.tags = info.tags;
        res_json.categories = info.categories;
        res_json.duration = info.duration;
        res_json.id = info.display_id;
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

queue.push('fixed gear bike');

queue.on('retry', function(d) {
    console.log('i am retrying!');
});

exports.pipeline = pipeline;
exports.queue = queue;
