<?php
use DevCycle\Model\UserData;
require_once(__DIR__ . '/vendor/autoload.php');

$pathArgs = explode('/', getenv('REQUEST_URI'));

// Configure API key authorization
$config = DevCycle\Configuration::getDefaultConfiguration()
    ->setApiKey('Authorization', $_ENV["DVC_SERVER_SDK_KEY"]);
// Uncomment the below lines to use unix domain sockets:
//->setHost("http:/v1")
//->setUDSPath("/tmp/phpsock.sock");
$options = new DevCycle\Model\DVCOptions(false);
$apiInstance = new DevCycle\Api\DVCClient(
    $config,
    dvcOptions: $options
);
$user_data = new UserData(array(
    "user_id" => "test"
));

switch ($pathArgs[1]) {
    case "spec":
        handleSpec();
        break;
    case "client":
        handleClient();
        break;
    case "command":
        handleCommand();
        break;
}


function handleClient() {

}

function handleCommand() {

}

function handleSpec() {
    echo json_encode(["name" => "PHP", "version" => "1.0.0", "capabilities" => ["LocalBucketing", "CloudBucketing", "Events"]]);
    exit;
}