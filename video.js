const level = require('level');
const jobs = require('level-jobs');
const cp = require('child_process');
const through = require('through2');
const settings = require('./settings');
const db = level('jobs/video');
const pg = require('pg');
const fs = require('fs');

const options = {
  maxConcurrency: 5,
  maxRetries:     2,
  backoff: {
    randomisationFactor: 0,
    initialDelay: 10,
    maxDelay: 300
  }
};

const process = through.obj(function(chunk, enc, cb) {
    console.log('starting extract video at %s', chunk.video_file_location);
    var extraction = cp.spawn('./extract_video.bash', [chunk.video_file_location]);
    cb();
    extraction.stdout.resume();
    extraction.stderr.resume();
    extraction.on('error', (err) => console.log(err));
    //extraction.on('exit', (exit_code) => this.push(JSON.stringify(chunk)));
});

const extract_audio = through.obj(function(chunk, enc, cb) {
});


const write_to_db = '肏';

const process_youtube = function(youtube_obj, cb) {
    console.log('starting extract video at %s', chunk.video_file_location);
    var extraction = cp.spawn('./process_youtube.bash', 
                              [youtube_obj.video_url,
                               youtube_obj.audio_url,
                               youtube_obj.id
                              ]);
    extraction.stdout.resume();
    extraction.stderr.resume();
    extraction.on('error', (err) => cb(err));
    extraction.on('exit', (exit_code) => {
        
    });

};

const worker = function(youtube_obj, cb) {
   // do download and analysis here 
   process_youtube(youtube_obj, function() {
       cb();
   });
};

const queue = jobs(db, worker, options);

exports.queue = queue;
