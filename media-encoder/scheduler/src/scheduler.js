'use strict';

let hubic = require('./hubic.js');
let path = require('path');
let config = require('/usr/src/config/config.js');
let _ = require('lodash');
let kue = require('kue');
let queue = kue.createQueue({
    redis: {
        host: 'redis'
    }
});

kue.app.listen(3000);

console.log('Scheduler launched, kue app listening on port 3000');

queue.on( 'error', function(err) {
    console.error('Queue error', err);
});

// Ensures the library directory exists
hubic.createLibraryDirectory().then(function() {
    // Retrieves the files index and extract images
    return hubic.retrieveIndex(true);
}).then(function (index) {
    let i, j, l, m = config.srcDirectories.length;
    let images = [];
    let indexMap = {};

    // Retrieve image files within the index
    for (i = 0, l = index.length; i < l; ++i) {
        indexMap['/' + index[i].name] = true;
        for (j = 0; j < m; ++j) {
            // Encode only files within the srcDirectories
            if (index[i].name.indexOf(config.srcDirectories[j]) === 0) {
                if (isImage(index[i].name)) {
                    images.push(index[i]);
                }
            }
        }
    }

    // Filter images that have already been generated
    console.log(images.length);
    images = _.filter(images, function (image) {
        return !hasEncodedVersion(image.name, indexMap);
    });
    console.log(images.length);
}).catch((err) => {
    console.log('Error!', err);
});


// // Create jobs
// for (let i = 0; i < 20; ++i) {
//     queue
//         .create('image', {
//             title: 'Test image ' + i,
//             path: '/path/to/image/' + i
//         })
//         .on('complete', (result) => {
//             console.log('Job completed !', result);
//         })
//         .removeOnComplete(true)
//         .save()
//     ;
// }


function isImage(filename) {
    var extension = path.extname(filename).substr(1).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp'].indexOf(extension) !== -1;
}

function getEncodedImagePath(file, formatSuffix) {
    var pathInfo = path.parse(file);
    var destDirectory = config.libraryDirectory + '/' + pathInfo.dir;
    return destDirectory + '/' + pathInfo.name + formatSuffix + '.jpg';
}

function hasEncodedVersion(file, index) {
    var hasAllFormats = true;

    if (isImage(file)) {
        // Check if all images formats exist
        return _.every(config.imagesFormats, function (format) {
            var newPath = getEncodedImagePath(file, format.suffix);
            return index[newPath] === true;
        });
    }
    return false;
}
