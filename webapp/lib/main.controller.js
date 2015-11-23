import './media-library.module.js';
import _ from 'lodash';

angular
    .module('media-library')
    .controller('MainController', function ($http) {
        let config = {
            apiURL: '{{PROXIED API URL}}'
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
                console.log(response.headers('x-container-object-count'));
                if (method.toLowerCase() === 'head') {
                    return response.headers();
                } else {
                    return response;
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

                console.log(body);

                // function retrieveObjects(marker) {
                //  marker = marker || '';
                //  return new Promise(function (resolve, reject) {
                //      console.log('Retrieving objects: ' + objects.length + ' / ' + objectsCount + ' (' + marker + ')');
                //      apiRequest('GET', '/default', {'marker': marker}).then(function (response) {
                //          objects = objects.concat(response);
                //          if (objects.length < objectsCount) {
                //              // Retrieve next batch of objects
                //              resolve(retrieveObjects(_.last(objects).name));
                //          } else {
                //              resolve(objects);
                //          }

                //      });
                //  });
                // }

                // return retrieveObjects();
            });
        }

        getIndex();
    });
