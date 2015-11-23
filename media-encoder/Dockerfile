FROM marcbachmann/libvips

RUN apt-get update

# Install nodejs (version 5.x) and npm
RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_5.x | sudo bash -
RUN apt-get install -y nodejs git git-core build-essential g++