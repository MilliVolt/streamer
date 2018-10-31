let queue = require('./queue');
let seed = [...process.argv].slice(2).join(' ');
queue.create('crawl', {
    title: '(seed) querying ' + seed,
    search_term: seed
}).save(() => process.exit(1));
