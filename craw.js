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
  maxConcurrency: 2,
  maxRetries:     2,
  backoff: {
    randomisationFactor: 0,
    initialDelay: 10,
    maxDelay: 300
  }
};

//const video_queue = require('./video_queue').queue;

const worker = function(search_item, cb) {
    console.log("job started crawling term: %s", search_item);
    pipeline(search_item, 3, function() {
        cb();
    });
};

const queue = jobs(db, worker, options);

const gen_list = (query, limit) => {
    const search = cp.spawn("torsocks",
                            ["-i",
                             "youtube-dl",
                             "ytsearch" + limit + ":" + query,
                             "-j"]);
    return search.stdout;
};

const parse_data = through.obj(function(chunk, enc, cb) {
    const info = JSON.parse(chunk.toString());
    let res_json = find_best_va(info); 
    res_json.tags = info.tags;
    res_json.categories = info.categories;
    res_json.duration = info.duration;
    res_json.id = info.display_id;
    console.log(res_json.id);
    cb();
    info.tags.map(tag => {
        queue.push(tag);
    });
    this.push('done');
    
});

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

var pipeline = (tag, lim, cb) => {
    console.log('now search for the 10 best list of %s', tag);
    gen_list(tag, lim)
        .pipe(parse_data)
        .on('data', function(data) {
        })
        .on('error', (err) => {
            cb(err);
        })
        .on('end', function() {
            console.log('end');
            cb();
        })
        ;
};

queue.push('fixed gear bike');

exports.pipeline = pipeline;
exports.queue = queue;
