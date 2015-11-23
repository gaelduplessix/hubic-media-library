# Media library webapp

**WARNING** This is a work in progress ! Don't run this unless you know exactly what you're doing. Use at your own risk.

WIP: Webapp to browse a hubiC library, using re-encoded versions of files from `media-encoder`.

To launch it, first run `nginx-proxy` with a correct access token so the webapp can connect to your account. Then run:

```
jspm install # You need jspm: npm install -g jspm
python -m SimpleHTTPServer # Or start any webserver, serving current directory
```
The webapp should run on `localhost:8000`. It doesn't do anything at this time, it's a WIP.