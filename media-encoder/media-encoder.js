// Dependencies
var request = require('request-promise'),
    _ = require('lodash'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    sharp = require('sharp'),
    uuid = require('node-uuid');

//request.debug = true;

var config = require('./config.js');

function apiRequest(method, path, queryParams, headers) {
    headers = headers || {};
    //console.log(method, path, queryParams, headers);
    return request({
        method: method,
        uri: config.apiURL + path,
        qs: queryParams,
        headers: _.assign({
            'X-Auth-Token': config.accessToken,
            'Accept': 'application/json'
        }, headers),
        json: true
    });
}

function apiRequestFile(method, path, headers) {
    headers = headers || {};
    //console.log(method, path, headers);
    return request({
        method: method,
        // Encode URI to prevent errors with accents
        uri: config.apiURL + '/default' + encodeURIComponent(path),
        headers: _.assign({
            'X-Auth-Token': config.accessToken
        }, headers),
        encoding: null
    });
}

function apiSendFile(file, path, headers) {
    headers = headers || {};
    return new Promise(function (resolve, reject) {
        fs.createReadStream(file).pipe(request({
            method: 'PUT',
            // Encode URI to prevent errors with accents
            uri: config.apiURL + '/default' + encodeURIComponent(path),
            headers: _.assign({
                'X-Auth-Token': config.accessToken,
                'X-Object-Meta-Hubiclocalcreationdate': 0,
                'X-Object-Meta-Hubiclocallastmodified': 0
            }, headers),
            encoding: null
        })
        .on('response', function (response) {
            resolve(response);
        })
        .on('error', function (error) {
            reject(error);
        }));
    });
}

/**
 * Retrieve all files index (yep, that can be a lot... we'll deal about that in v2)
 */
function getIndex() {
    return apiRequest('HEAD', '/default').then(function (body) {
        var objectsCount = body['x-container-object-count'];
        var objects = [];

        function retrieveObjects(marker) {
            marker = marker || '';
            return new Promise(function (resolve, reject) {
                console.log('Retrieving objects: ' + objects.length + ' / ' + objectsCount + ' (' + marker + ')');
                apiRequest('GET', '/default', {'marker': marker}).then(function (response) {
                    objects = objects.concat(response);
                    if (objects.length < objectsCount) {
                        // Retrieve next batch of objects
                        resolve(retrieveObjects(_.last(objects).name));
                    } else {
                        resolve(objects);
                    }

                });
            });
        }

        return retrieveObjects();
    });
}

/**
 * Retrieves files index from a previous cached version, or request it again
 * Note: Cache is mainly for dev purpose, usually you always want to refresh it
 * to avoid re-generating existing media
 */
function retrieveIndex(useCache) {
    return new Promise(function (resolve, reject) {
        var index;

        if (useCache) {
            try {
                var index = fs.readFileSync('filesIndex.json', {encoding: 'utf-8'});
            } catch (e) {}
        }

        if (index) {
            resolve(JSON.parse(index));
        } else {
            getIndex().then(function (index) {
                fs.writeFile('filesIndex.json', JSON.stringify(index));
                resolve(index);
            });
        }
    });
}

/**
 * Get metadata of a given file/directory (HEAD request).
 * If the file doesn't exists, returns null (without rejecting)
 */
function getMeta(path) {
    return new Promise(function (resolve, reject) {
        apiRequest('HEAD', '/default' + path).then(function (meta) {
            resolve(meta);
        }, function (error) {
            if (error.statusCode === 404) {
                resolve(null);
            } else {
                reject(error);
            }
        });
    });

}

/**
 * Creates a directory
 */
function createDirectory(path) {
    return apiRequest('PUT', '/default' + path, null, {
        'Content-Type': 'application/directory'
    });
}

/**
 * Creates the directory that will contain all encoded medias
 */
function createLibraryDirectory() {
    return getMeta(config.libraryDirectory).then(function (meta) {
        if (!meta) {
            return createDirectory(config.libraryDirectory).then(function () {
                console.log('Directory created successfully !');
            });
        } else if (meta['content-type'] !== 'application/directory') {
            throw Error('Error: Cannot create library directory: filename is already used');
        } else {
            console.log('Media library directory already exists');
        }
    });
}

/**
 * Generate lighter image files for a given list of existing images
 */
function generateImages(images) {
    console.log('Start generation of ' + images.length + ' images');

    // Run generation of images 3 at a time
    async.eachLimit(images, 3, function (image, imageDone) {
        // Decompose path
        var pathInfo = path.parse(image.name);

        if (!pathInfo.dir || !pathInfo.name) {
            return imageDone('Invalid path: ' + image.name);
        }

        // Download image
        apiRequestFile('GET', '/' + image.name).then(function (res) {
            var tmpImage = config.tmpImagesDirectory + '/' + uuid.v4() + '.jpg';

            fs.writeFileSync(tmpImage, res);

            // Generate file formats in parallel
            async.each(config.imagesFormats, function (format, formatDone) {
                var newPath = getEncodedImagePath(image.name, format.suffix),
                    tmpFile = config.tmpImagesDirectory + '/' + uuid.v4() + '.jpg';

                var resizeJob = sharp(tmpImage);
                if (format.width || format.height) {
                    resizeJob.resize(format.width, format.height);
                }
                if (format.max) {
                    resizeJob.max();
                }
                if (format.quality) {
                    resizeJob.quality(format.quality);
                }
                resizeJob.toFile(tmpFile, function (err) {
                    if (err) {
                        console.log('Error when generating image: ', err);
                        return formatDone();
                    }
                    // Send image to server
                    console.log('Image sent:', newPath);
                    apiSendFile(tmpFile, newPath).then(function (res) {
                        // Delete tmp file
                        fs.unlinkSync(tmpFile);
                        formatDone();
                    });
                });
            }, function (error) {
                // Delete tmp image
                fs.unlinkSync(tmpImage);
                console.log('Image done', image.name);
                imageDone();
            });
        });
    }, function (error) {
        console.log('Done !', error);
    });
}

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
            return !!_.find(index, function (file) {
                return ('/' + file.name) === newPath;
            });
        });
    }
    return false;
}

// Entry point

// Ensures the library directory exists
createLibraryDirectory().then(function() {
    // Retrieves the files index and extract images
    return retrieveIndex(true);
}).then(function (index) {
    var i, j, l, m = config.srcDirectories.length;
    var images = [];

    // Retrieve image files within the index
    for (i = 0, l = index.length; i < l; ++i) {
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
    images = _.filter(images, function (image) {
        return !hasEncodedVersion(image.name, index);
    });
    generateImages(images);
});
