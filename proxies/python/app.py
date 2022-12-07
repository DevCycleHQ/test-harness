from flask import Flask, request
from devcycle_python_sdk import Configuration, DVCOptions, DVCClient, UserData, Event
from operator import itemgetter
from re import sub

app = Flask(__name__)

def camel_case(s):
  s = sub(r"(_|-)+", " ", s).title().replace(" ", "")
  return ''.join([s[0].lower(), s[1:]])

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

@app.post("/client")
def client():
    body = request.get_json()
    client_id, sdk_key, options = [body.get(k, None) for k in ('clientId', 'sdkKey', 'options')]

    if (client_id == None):
        error = {
            "error": "Invalid request: missing clientId"
        }

        return error, 400

    configuration = Configuration()
    configuration.api_key['Authorization'] = sdk_key

    dvc_client = DVCClient(configuration, options)

    dataStore['clients'][client_id] = dvc_client

    success = {
        "message": "success"
    }

    return success, 201, {"Location": 'client/' + client_id}


@app.post("/user")
def user():
    body = request.get_json()
    user = UserData(**body)
    user_storage_id = str(len(dataStore['users'].values()))
    dataStore['users'][user_storage_id] = user

    user_dict = user.to_dict()

    camelcase_user = {camel_case(key): val for key, val in user_dict.items()}

    camelcase_user['user_id'] = camelcase_user['userId']
    del camelcase_user['userId']

    return {
        "entityType": "User",
        "data": camelcase_user
    }, 201, { "Location": "user/" + user_storage_id }

