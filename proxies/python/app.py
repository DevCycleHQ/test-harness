from flask import Flask, request
from .handlers.command import handle_command
from .handlers.client import handle_client
from .handlers.user import handle_user
import sys
import traceback

app = Flask(__name__)


dataStore = {
    'clients': {},
    'users': {},
    'commandResults': {},
}

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p"

@app.route("/spec")
def spec():
    return {
        "name": "Python",
        "version": "", # TODO add branch name or SDK version here
        "capabilities": ["EdgeDB", "CloudBucketing"]
    }

@app.post("/client")
def client():
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

