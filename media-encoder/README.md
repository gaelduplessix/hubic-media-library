# hubiC Media Encoder

**WARNING** This is a work in progress ! Don't run this unless you know exactly what you're doing. Use at your own risk.

Nodejs application that connects to a hubiC account, retrieves all images it hosts and starts generating thumbnails + lighter versions.
To launch it, simply create a `config.js` file based on `config.js.sample` and run:

```
docker-compose up
```
Eventually it'll connect to the API, retrieve the list of all files it contains and all the images contained in `config.srcDirectories` then start generating images based on `config.imagesFormats`.