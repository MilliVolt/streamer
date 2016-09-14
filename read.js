var level = require('level');
var util = require('util');
var db = level(util.format('jobs/%s', process.argv[2]));
var stream = db.createReadStream();
var count = 0;
stream.on('data', (d) => {
    console.log(JSON.parse(d.value).id);
    count ++;
});
stream.on('end', () => console.log(count));

