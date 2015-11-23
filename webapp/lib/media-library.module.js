import _ from 'lodash';
// Expose lodash to global scope so Restangular can access it
window._ = _;

import angular from 'angular';
import 'angular-bootstrap';
import 'restangular';

angular
    .module('media-library', [
        'ui.bootstrap', 'restangular'
    ])
;
