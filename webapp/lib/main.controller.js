import './media-library.module.js';
import _ from 'lodash';
import IDBHelper from './IDBHelper.js';

angular
.module('media-library')
.controller('MainController', function ($http, $q) {
    let model = this;

    let config = {
        apiURL: 'http://192.168.99.100:8080/v1/API_URL'
    };

    function apiRequest(method, path, queryParams, headers) {
        headers = headers || {};
        //console.log(method, path, queryParams, headers);
        return $http({
            method: method,
            url: config.apiURL + path,
            params: queryParams,
            headers: _.assign({
                'Accept': 'application/json'
            }, headers)
        }).then(function (response, b, c) {
            if (method.toLowerCase() === 'head') {
                return response.headers();
            } else {
                return response.data;
            }
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
     */
     function retrieveIndex(useCache) {
        return $q((resolve, reject) => {
            var index;
            // IDBHelper needs angular $q service
            IDBHelper.q = $q;

            if (useCache) {
                IDBHelper.get('hubiCMediaLibraryDB', 'filesIndex', 'index').then((indexFromCache) => {
                    if (indexFromCache) {
                        console.log('Retrieved index from cache');
                        resolve(indexFromCache);
                    } else {
                        loadIndex();
                    }
                });
            } else {
                loadIndex();
            }

            function loadIndex() {
                console.log('Loading files index...');
                getIndex().then(function (index) {
                    // Save index
                    IDBHelper.save('hubiCMediaLibraryDB', 'filesIndex', index, 'index').then(() => {
                        resolve(index);
                    });
                });
            }
        });
    }

    // Expose clear function to global scope so we can call it from the console
    window.clearIndexCache = function () {
        IDBHelper.clearStore('hubiCMediaLibraryDB', 'filesIndex');
    };

    model.isImage = function (file) {
        return file.content_type.indexOf('image') !== -1 && file.path.indexOf('-thumb') !== -1;
    };

    model.getImageUrl = function (image) {
        return config.apiURL + '/default/' + image.path;
    };

    let filesTree = {
        name: 'hubiC',
        content_type: 'application/directory',
        children: []
    };

    // Entry point

    retrieveIndex(true).then((index) => {
        // Create a tree from files index
        _.forEach(index, (file) => {
            let parts = file.name.split('/');
            let parentNode = filesTree;
            // Iterate over all parent directories to retrieve parent node in file tree
            _.forEach(parts.slice(0, -1), (pathPart) => {
                let newParent = _.find(parentNode.children, (child) => child.name === pathPart);
                if (!newParent) {
                    newParent = {
                        name: pathPart,
                        content_type: 'application/directory',
                        children: []
                    };
                    parentNode.children.push(newParent);
                }
                parentNode = newParent;
            });
            file.path = file.name;
            file.name = _.last(parts);
            file.children = [];
            parentNode.children.push(file);
        });

        console.log(filesTree);

        model.currentDirectory = filesTree;
    });
});
