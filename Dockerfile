FROM node:0.12.7

RUN apt-get update 
RUN apt-get install -y ghostscript imagemagick graphicsmagick

RUN echo 'always-auth=true' > /root/.npmrc
RUN echo 'registry=http://m2.umiit.cn/content/groups/npm/' >> /root/.npmrc
RUN echo '_auth=dW1pOnVtaTEyMzQ=' >> /root/.npmrc
RUN echo 'email=ci@umiit.cn' >> /root/.npmrc

RUN npm install -g grunt-cli supervisor

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
RUN grunt deploy

CMD [ "npm", "start" ]
EXPOSE 3601
