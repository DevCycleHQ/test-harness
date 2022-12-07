FROM python:3.10-alpine
ARG PYTHON_SDK_VERSION
ENV PYTHON_SDK_VERSION $PYTHON_SDK_VERSION

COPY ./requirements.txt /app/requirements.txt
COPY ./install.sh /app/install.sh

WORKDIR /app

RUN pip install -r requirements.txt
RUN ./install.sh

COPY . /app

ENTRYPOINT python -m flask --app app run --host=0.0.0.0