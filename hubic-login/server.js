// Dependencies
var express = require('express'),
    app = express(),
    simpleOauth2 = require('simple-oauth2'),
    request = require('request');

// Config (for API access)
var config = require('./config.js');

// Constants
var HUBIC_API = 'https://api.hubic.com',
    HUBIC_AUTH_PATH = '/oauth/token',
    HUBIC_SCOPE = 'usage.r,account.r,getAllLinks.r,credentials.r,sponsorCode.r,activate.w,sponsored.r,links.drw';

var oauth2 = simpleOauth2({
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        site: HUBIC_API,
        tokenPath: HUBIC_AUTH_PATH
    });

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
    redirect_uri: 'http://localhost:3000/callback',
    scope: HUBIC_SCOPE,
    state: 'veryRandomStr'
});

// Initial page redirecting to hubiC login
app.get('/auth', function(req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function(req, res) {
    var code = req.query.code, state = req.query.state;
    console.log('/callback');
    oauth2.authCode.getToken({
        code: code, 
        redirect_uri: 'http://localhost:3000/callback'
    }, saveToken);

    function saveToken(error, result) {        
        if (error) {
            console.log('Access Token Error', error.message);
            return;
        }
        if (!result) {
            console.log('Invalid access token');
            return;
        }
        var oauthToken = oauth2.accessToken.create(result);
        console.log('Token created !', oauthToken.token.access_token);
        console.log('Getting OpenStack API credentials...');
        request({
            url: HUBIC_API + '/1.0/account/credentials',
            headers: {
                'Authorization': 'Bearer ' + oauthToken.token.access_token
            }
        }, function (error, response, body) {
            response = JSON.parse(body);
            console.log('API URL: ' + response.endpoint);
            console.log('Access token: ' + response.token);
            console.log('Expires: ' + response.expires);
            res.send(
                '<h1>Login successful !</h1>' +
                '<ul>' +
                '   <li>hubiC OAuth Token: Bearer ' + oauthToken.token.access_token + '</li>' +
                '   <li>OpenStack API URL: ' + response.endpoint + '</li>' +
                '   <li>OpenStack API Acces token: ' + response.token + '</li>' +
                '   <li>OpenStack API Token expires: ' + response.expires + '</li>' +
                '</ul>' +
                '<a href="/auth">Login again</a>'
            );
        })        
    }
});

app.get('/', function(req, res) {
    res.send('<a href="/auth">Log in</a>');
});

app.listen(3000);

console.log('Express server started on port 3000');