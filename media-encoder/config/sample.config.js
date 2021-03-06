'use strict';

module.exports = {
    // Src config
    apiURL: '{{OpenStack API URL}}',
    accessToken: '{{OpenStack API access token}}',
    libraryDirectory: '/Media library',
    srcDirectories: [
        'Datas/Evenements'
    ],

    // Generation config
    imagesFormats: [
        {
            suffix: '-thumb',
            width: 256,
            height: 256,
            crop: true,
            quality: 80
        },
        {
            suffix: '-large',
            width: 2048,
            height: 2048,
            max: true,
            quality: 70
        }
    ],

    tmpImagesDirectory: './tmp'
};
