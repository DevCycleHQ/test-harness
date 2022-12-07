from flask import Flask
from devcycle_python_sdk import Configuration, DVCOptions, DVCClient, UserData, Event

app = Flask(__name__)

dataStore = {
    'clients': {},
    'users': {},
    'commandResults': {},
}


@app.route("/")
def hello_world():
    return "<p>Hello, World!</p"

@app.route("/testClient")
def test_client():
    configuration = Configuration()
    configuration.api_key['Authorization'] = 'server_key'
    dvc_client = DVCClient()
    user = UserData(user_id="test")
    return "" + str(dvc_client.variable(user, "my-variable", False).value)

@app.route("/spec")
def spec():
    return {
        "name": "Python",
        "version": "", # TODO add branch name or SDK version here
        "capabilities": ["EdgeDB", "CloudBucketing"]
    }