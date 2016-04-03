'use strict';

let request = require('request-promise');
let _ = require('lodash');
let fs = require('fs');
let config = require('/usr/src/config/config.js');

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
                var index = fs.readFileSync(__dirname + '/filesIndex.json', {encoding: 'utf-8'});
            } catch (e) {}
        }

        if (index) {
            resolve(JSON.parse(index));
        } else {
            getIndex().then(function (index) {
                fs.writeFile(__dirname + '/filesIndex.json', JSON.stringify(index));
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

module.exports = {
    getIndex, retrieveIndex, createLibraryDirectory
};
