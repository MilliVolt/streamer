const level = require('level');
const cp = require('child_process');
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
    return pg('tft.video').where({'url_id': youtube_obj.id})
                          .catch((e) => {
                              throw new DatabaseError(e.message);
                          });
};

const write_to_video_tbl = function(trx, youtube_obj) {
    return pg('tft.video')
            .transacting(trx)
            .returning('tags')
            .insert(youtube_obj);
};

const write_to_tag_tbl = function(trx, youtube_obj) {
        return function(res) {
            if (youtube_obj.tags.length > 0) {
                let ins = youtube_obj.tags.map((x) => {
                    return {tag: x};
                });
                let insert_query =pg('tft.tags')
                        .transacting(trx)
                        .insert(ins)
                        .toString();
                        //.on_conflict_do_nothing
                let on_conflict = 'ON CONFLICT DO NOTHING';
                let query = util.format(insert_query, on_conflict);
                return pg.raw(query).transacting(trx);
            }
            return;

        };
};

const write_to_videotag_tbl = function(trx, youtube_obj) {
    return function(res) {
        return pg
            .transacting(trx)
            .select('tags.id as tag_id', 'video.id as video_id')
            .from(pg.raw('tft.tags as tags, tft.video as video'))
            .where({'video.url_id': youtube_obj.url_id})
            .whereIn('tags.tag', youtube_obj.tags)
            .then((ins) => pg('tft.videotags').transacting(trx).insert(ins));
    };
};

const transact = function(youtube_obj) {
    return pg.transaction(function(trx) {
        write_to_video_tbl(trx, youtube_obj)
            .then(write_to_tag_tbl(trx, youtube_obj))
            .then(write_to_videotag_tbl(trx, youtube_obj))
            .then(trx.commit)
            .then(Promise.resolve)
            .catch((err) => {
                console.log(err.message);
                trx.rollback(err);
                Promise.reject(err);
            });
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

const res_yt = (youtube_obj) => {
    let res = {};
    res.url_id = youtube_obj.id;
    res.duration = youtube_obj.duration;
    res.tags = youtube_obj.tags || []; // in case if it's undefined
    res.video_metadata = JSON.stringify(youtube_obj); //json(b)
    return res;
};

const process_youtube = (youtube_obj)=> {
    return new Promise((resolve, reject) => {
        fs.stat(util.format('buf/audio_%s.tmp', youtube_obj.id), (err, stat)=> {
            if (err && err.code === 'ENOENT') { // Error NO ENTry
                const extraction = cp.spawn('./process_youtube.bash', [youtube_obj.id]);
                extraction.stdout.resume();
                //extraction.stderr.resume();
                extraction.on('error', (err) => reject(err));
                extraction.on('exit', function(exit_code) {
                    resolve(res_yt(youtube_obj));
                });
                extraction.stderr.on('data', (err) => reject(err.toString()));
            } else {
                console.log(util.format('audio file %s exists in fs, skipping processing'));
                return resolve(res_yt(youtube_obj));
            }
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
        .then(transact)
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
                console.log('unhandled err:');
                console.log(err);
                cb(err);
            }
        });
};

queue.process('video', settings.video_concur, function (job, cb) {
    pipeline(job.data.res_json, function(err) {
        if (err) cb(err);
        cb();
    });
});
