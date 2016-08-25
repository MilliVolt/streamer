const ytdl = require("youtube-dl");
const cp = require('child_process');
const through = require('through2');


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
    res_json.id = info.display_id;
    debugger;
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
    console.log(chunk);
    cb();
});


const write_to_db = '肏';

var rs = gen_list('bike', 50);

//here's the pipeline
const pipeline = ()=> {
    rs
        .pipe(parse_data)
        .pipe(download_video);
};

pipeline();


