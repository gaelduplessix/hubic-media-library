# hubiC media library

Set of tools to be able to easily and quickly enjoy media hosted with hubiC. The idea consists in:

 - **[in progress]** Login to hubiC API using OAuth2: currently handled by a nodejs application in `hubic-login`
 - **[in progress]** Proxying the OpenStack Swift API with an nginx server to be able to stream medias directly from the source. Nginx just adds the authentication token so the files can be streamed using any web browser. This is currently handled by the very basic tool `nginx-proxy`
 - **[todo]** Fetch all media files and generate light versions of them to be able to fastly retrieve them:
	 - generate images thumbnails and light jpeg versions to overcome the problem of downloading originals each time we want to see a 8Mb picture
	 - re-encode videos to highly compressed MP4 so they can be instantly streamed. Also generate thumbnails (ideally gifs to have a good overview of the video)
 - **[todo]** Create a web interface that allows to browse the medias while automatically using re-encoded versions if available. Would also be nice to index the files using any available metadata (pictures EXIF, ...) and build a nice search feature
 - **[todo]** Mobile access ?