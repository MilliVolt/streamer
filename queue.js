const kue = require('kue');
const queue = kue.createQueue();
//kue.app.listen('3000');
//queue.push('fixed gear bike');


queue.on('retry', function(d) {
    //console.log('i am retrying! ', ...arguments);
});

queue.on('error', function(err) {
    console.log('oops.. ' + err);
});

module.exports = queue;
