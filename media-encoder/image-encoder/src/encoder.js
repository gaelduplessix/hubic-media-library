'use strict';

let kue = require('kue');
let queue = kue.createQueue({
    redis: {
        host: 'redis'
    }
});

queue.on( 'error', function(err) {
    console.error('Queue error', err);
});

console.log('Start processing jobs...');

queue.process('image', function (job, done) {
    console.log('received job!', job.data);
    done(null, 'Finished !' + job.id);
});
