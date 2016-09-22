const level = require('level');
const sub = require('level-sublevel');
const db = sub(level('db'));

exports.crawl = db.sublevel('crawl');
exports.video = db.sublevel('video');

