# nginx proxy

Very basic nginx configuration to proxy hubiC OpenStack API so files can can be streamed from any web browser.

To launch it, simply create an `nginx-conf/nginx.conf` file based on `nginx-conf/nginx.conf.sample` and run:

```
docker-compose up
```