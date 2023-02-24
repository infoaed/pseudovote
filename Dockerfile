FROM python:3-slim
WORKDIR /usr/app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_DISABLE_PIP_VERSION_CHECK 1
COPY ./requirements.txt requirements-deploy.txt /usr/app/
RUN pip install --no-cache-dir --upgrade -r /usr/app/requirements.txt -r /usr/app/requirements-deploy.txt
COPY . /usr/app
