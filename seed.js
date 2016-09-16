var queue = require('./crawl').queue;
queue.create('crawl', {
    title: 'seeting crawl with ' + process.argv[2],
    search_term: process.argv[2]
});
