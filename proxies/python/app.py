from flask import Flask, request
from .handlers.command import handle_command
from .handlers.client import handle_client
from .handlers.user import handle_user
import logging
import traceback
import sys

app = Flask(__name__)

logging.basicConfig()
logging.root.setLevel(logging.INFO)
logger = logging.getLogger(__name__)

dataStore = {
    'clients': {},
    'users': {},
    'commandResults': {},
}

@app.route("/")
def root():
    return "Hello, World!"

@app.route("/spec")
def spec():
    logger.info("SPEC REQUEST: %s", request)
    return {
        "name": "Python",
        "version": "", # TODO add branch name or SDK version here
        "capabilities": ["EdgeDB", "CloudBucketing"]
    }

@app.post("/client")
def client():
    logger.info("CLIENT REQUEST: %s", request)
    body = request.get_json()
    try:
        return handle_client(body, dataStore)
    except Exception as e:
        ex_type, ex_value, _ = sys.exc_info()

        return {
            "exception": str(e),
            "stack": traceback.format_exc()
        }


@app.post("/user")
def user():
    logger.info("USER REQUEST: %s", request)
    body = request.get_json()
    try:
        return handle_user(body, dataStore)
    except Exception as e:
        ex_type, ex_value, _ = sys.exc_info()

        return {
            "exception": str(e),
            "stack": traceback.format_exc()
        }

@app.post('/<path:location>')
def command(location):
    logger.info("LOCATION REQUEST: %s", request)
    body = request.get_json()

    is_async = body.get('isAsync', False)

    try:
        return handle_command(location, body, dataStore)
    except Exception as e:
        ex_type, ex_value, _ = sys.exc_info()

        if is_async:
            return {
                "asyncError": str(e),
                "stack": traceback.format_exc()
            }
        else:
            return {
                "exception": str(e),
                "stack": traceback.format_exc()
            }

