const level = require('level');
const cp = require('child_process');
const through = require('through2');
const settings = require('./settings');
const Promise = require('bluebird');
const constring = settings.constring;
const pg = require('knex')({
    client: 'pg',
    connection: constring
});
const fs = require('fs');
Promise.promisifyAll(fs);
const util = require('util');
const queue = require('./queue');
const ExistError = require('./error').ExistError;
const DatabaseError = require('./error').DatabaseError;

const read_from_db = function(youtube_obj) {
    return pg('tft.video').where({'url_id': youtube_obj.id});
};
const write_to_db = function(youtube_obj) {
    return pg('tft.video').insert(youtube_obj)
                          .catch((e) => {
                              throw new DatabaseError(e.message + 
                                  e.youtube_obj.id);
                          });
};


const get_audio_score = (youtube_obj)=> {
    const path = util.format('buf/audio_%s.tmp', youtube_obj.url_id);
    return new Promise((resolve, reject) => {
        return fs.readFileAsync(path).then((res) =>{
            var cleaned = res
                    .toString()
                    .split('\n')
                    .slice(0, -1);
            youtube_obj.audio_beat_times = cleaned || [];
            resolve(youtube_obj);
        });
    });
};

const process_youtube = (youtube_obj)=> {
    return new Promise((resolve, reject) => {
        var extraction = cp.spawn('./process_youtube.bash', 
                                  [youtube_obj.id]);
        extraction.stdout.resume();
        extraction.stderr.resume();
        extraction.on('error', (err) => reject(err));
        extraction.on('exit', function(exit_code) {
            let res = {};
            res.url_id = youtube_obj.id;
            res.duration = youtube_obj.duration;
            res.tags = youtube_obj.tags || []; // in case if it's undefined
            res.video_metadata = JSON.stringify(youtube_obj); //json(b)
            resolve(res);
        });
    });
};

const pipeline = function(youtube_obj, cb) {
   // do download and analysis here 
    console.log('starting processing %s' , youtube_obj.id);
    read_from_db(youtube_obj)
        .then((exist) => {
            if (exist.length !== 0) {
                const message = util.format('%s exists in the db..skip', 
                                             youtube_obj.id);
                throw new ExistError(message);
            } else {
                return process_youtube(youtube_obj);
            }
        })
        .then(get_audio_score)
        .then(write_to_db)
        .then(function(){
            console.log('WROTE IN DB ' + youtube_obj.id);
            cb();
        })
        .catch(function(err) {
            if (err instanceof ExistError) {
                console.log('ExistError');
                console.log(err.message);
                cb();
            } else if (err instanceof DatabaseError) {
                console.log('DatabaseError');
                console.log(err.message);
                cb();
            } else {
                cb(err);
            }
            //Promise.reject(err);
        });
};

queue.process('video', settings.video_concur, function (job, cb) {
    pipeline(job.data.res_json, function(err) {
        if (err) cb(err);
        cb();
    });
});
