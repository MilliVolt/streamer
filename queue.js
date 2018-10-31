const kue = require('kue');
const queue = kue.createQueue();
//kue.app.listen('3000');
//queue.push('fixed gear bike');


queue.on('retry', function(d) {
    console.log('OOPS QUEUE RETRY ', ...arguments);
});

queue.on('error', function(err) {
    console.log('OOPS QUEUE ERROR.. ' + err);
});

module.exports = queue;
