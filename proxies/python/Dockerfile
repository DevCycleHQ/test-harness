FROM python:3.10

ARG SDK_GITHUB_SHA
ENV SDK_GITHUB_SHA $SDK_GITHUB_SHA

ARG SDKS_TO_TEST
ENV SDKS_TO_TEST $SDKS_TO_TEST

ARG PYTHON_SDK_VERSION
ENV PYTHON_SDK_VERSION $PYTHON_SDK_VERSION

WORKDIR /app

RUN apt-get update -y && \
    apt-get install -y git

COPY requirements.txt ./
COPY install.sh ./

RUN pip install -r requirements.txt
RUN ./install.sh

EXPOSE 3000

COPY . /app

ENTRYPOINT python -m flask --app app run --host=0.0.0.0 -p 3000