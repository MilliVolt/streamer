var queue = require('./queue');
queue.create('crawl', {
    title: '(seed) querying ' + process.argv[2],
    search_term: process.argv[2]
}).save(() => process.exit(1));
