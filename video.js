const level = require('level');
const jobs = require('level-jobs');
const cp = require('child_process');
const through = require('through2');
const settings = require('./settings');
const Promise = require('bluebird');
const db = level('jobs/video');
const constring = settings.constring;
const pg = require('knex')({
    client: 'pg',
    connection: constring
});
const fs = require('fs');
const util = require('util');

//
// tft=# select * from tft.video;
// id | url_id | duration | video_shot_times | audio_beat_times | video_metadata 
// ----+--------+----------+------------------+------------------+----------------
// (0 rows)
//

const options = {
  maxConcurrency: 3,
  maxRetries:     2,
  backoff: {
    randomisationFactor: 0,
    initialDelay: 10,
    maxDelay: 300
  }
};

const read_from_db = function(youtube_obj) {
    return pg('tft.video').where({'url_id': youtube_obj.id});
};
const write_to_db = function(youtube_obj) {
    return pg('tft.video').insert(youtube_obj);
};

const get_video_score = function(id) {
    const path = util.format('buf/video_%s.tmp.simp', id);
    debugger;
    return fs
            .readFileSync(path)
            .split('\n')
            .splice(0, -1);
};

const get_audio_score = function(id) {
    const path = util.format('buf/audio_%s.tmp', id);
    return fs
            .readFileSync(path)
            .split('\n')
            .splice(0, -1);
};

const process_youtube = (youtube_obj)=> {
    return new Promise((resolve, reject) => {
        console.log('in the promise');
        var extraction = cp.spawn('./process_youtube.bash', 
                                  [youtube_obj.video_url,
                                   youtube_obj.audio_url,
                                   youtube_obj.id
                                  ]);
        extraction.stdout.resume();
        extraction.stderr.resume();
        extraction.on('error', (err) => reject(err));
        extraction.on('exit', function(exit_code) {
//
// tft=# select * from tft.video;
// id | url_id | duration | video_shot_times | audio_beat_times | video_metadata 
// ----+--------+----------+------------------+------------------+----------------
// (0 rows)
//
            let res = {};
            res.url_id = youtube_obj.id;
            res.duration = youtube_obj.info.duration;
            res.video_shot_times = get_video_score(youtube_obj.id);
            res.audio_beat_times = get_audio_score(youtube_obj.id);
            res.video_metadata = youtube_obj.info;
            resolve(res);
        });
    });
};

const worker = function(youtube_obj, cb) {
   // do download and analysis here 
    console.log('starting processing %s' , youtube_obj.id);
    read_from_db(youtube_obj)
        .then((exist) => {
            if (exist.length !== 0) {
                console.log('%s exists in the db..skip', youtube_obj.id);
                cb();
            } else {
                return process_youtube(youtube_obj);
            }
        })
        .then(write_to_db)
        .then(function(){
            cb();
        })
        .catch(function(err) {
            Promise.reject(err);
        });
    };

const queue = jobs(db, worker, options);


exports.queue = queue;
