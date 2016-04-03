FROM node

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install dependencies
COPY package.json /usr/src/app/
RUN npm install -q

# Copy sources
COPY . /usr/src/app

# Expose port 3000 for kue webapp
EXPOSE 3000

CMD [ "npm", "start" ]
