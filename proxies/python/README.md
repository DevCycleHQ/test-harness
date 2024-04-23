# Running Python Proxy Locally

Ensure you have a Python 3.9+ environment set up and then use pip to install the requirements for the proxy

## Install Requirements

The proxy really just needs Flask. Requirements.txt tracks all the hard requirements to run the server

```bash
pip install -r requirements.txt
```

## Install the SDK

You can run the proxy against either a released version or a local version on your workstation. It is important to
use `pip` as it will install the related dependencies for the SDK

#### Current SDK Release

This will install the most recent release of the SDK from PyPy

```bash
 pip install devcycle-python-server-sdk
```

#### Specific SDK Version

Use the following but replace the version number with the version you want to use.

```bash
 pip install devcycle-python-server-sdk==1.0.0
```

#### Local SDK

If you want the proxy to use a local python-server-sdk project folder you can install the package in
[editible mode](https://packaging.python.org/en/latest/guides/distributing-packages-using-setuptools/#working-in-development-mode) which will create a symlink to the local folder behind the scenes. You can use relative or
absolute paths as needed. it is recommended that you keep your python-server-sdk folder in the same parent
directory as the `test-harness` project folder.

```bash
pip3 install -e ../../../python-server-sdk/
```

#### Uninstall previous versions of the SDK

```bash
pip uninstall devcycle-python-server-sdk
```

## Run the Proxy

```bash
python3 -m flask --app app run --host=0.0.0.0 -p 3000
```

### Using PyCharm

If you are using an IDE like PyCharm you will need to setup the project to run the proxy inside of the IDE and use debugging

- Add the dependencies in `requirements.txt` to the project via the IDE's package manager. In PyCharm it is called **Python Packages**
- Create a new Run/Debug configuration in the IDE
- Choose a Flask Server template
- Set the target type to Script Path
- Set the target to the `app.py` file
- Set host and port as additional options (or cmd line args): `--host=0.0.0.0 -p 3000`
