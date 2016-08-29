const ytdl = require("youtube-dl");
const cp = require('child_process');
const through = require('through2');
const util = require('util');


const gen_list = (query, limit) => {
    const search = cp.spawn("youtube-dl", 
                            ["ytsearch" + limit + ":" + query,
                             "-j"]);
    return search.stdout;
};

const parse_data = through.obj(function(chunk, enc, cb) {
    const info = JSON.parse(chunk.toString());
    cb();
    let res_json = find_best_va(info); 
    res_json.tags = info.tags;
    res_json.description = info.description;
    res_json.categories = info.categories;
    res_json.duration = info.duration;
    res_json.id = info.display_id;
    this.push(res_json);
    
});

const find_best_va = (info) => {
    const re = /^([0-9][0-9][0-9]).*\+([0-9][0-9][0-9]).*/g;
    const regex_res = re.exec(info.format);
    const vid = regex_res[1];
    const aid = regex_res[2];
    const v_url = info.formats.filter(x => x.format_id === vid)[0].url;
    const a_url = info.formats.filter(x => x.format_id === aid)[0].url;
    return {video_url: v_url,
            audio_url: a_url};
};

const download_video = through.obj(function(chunk, enc, cb) {
    console.log('start downloading %s video', chunk.id);
    chunk.video_file_location = util.format('video_%s', chunk.id);
	const download = cp.spawn('wget',
							  ['-O', 
                               chunk.video_file_location,
							   chunk.video_url]);
    download.stdout.resume();
    download.stderr.resume();
    download.on('exit', () => this.push(chunk));
});

const download_audio = through.obj(function(chunk, enc, cb) {
    console.log('start downloading %s audio', chunk.id);
	const download = cp.spawn('wget',
							  ['-O', 
							   chunk.id + '_audio',
							   chunk.audio_url]);
    download.stdout.resume();
    download.stderr.resume();
    cb();
    download.on('exit', function() {
        console.log('closed');
    });
});

const extract_video = through.obj(function(chunk, enc, cb) {
    console.log('starting extract video at %s', chunk.video_file_location);
    var extraction = cp.spawn('./extract_video.bash', [chunk.video_file_location]);
    extraction.stdout.resume();
    extraction.stderr.resume();
    cb();
    extraction.on('error', (err) => console.log(err));
    extraction.on('exit', function(exit_code) {
        this.push(chunk);
    });
});

const extract_audio = through.obj(function(chunk, enc, cb) {
});


const write_to_db = '肏';

var rs = gen_list('very short video', 50);

//here's the pipeline
const pipeline = ()=> {
    rs
        .pipe(parse_data)
        .pipe(download_video)
        .pipe(extract_video)
        ;
        //.pipe(download_audio)
        //.pipe(matching)
        //.pipe(delete_video)
        //.pipe(write_to_db)
};

pipeline();


