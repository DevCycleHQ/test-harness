<?php

require_once(__DIR__ . '/vendor/autoload.php');

$pathArgs = explode('/', getenv('REQUEST_URI'));
if (sizeof($pathArgs) < 2) {
    exit(400);
}

switch ($pathArgs[1]) {
    case "spec":
        handleSpec();
    case "client":
        handleCommand($pathArgs, true);
    case "command":
        handleCommand($pathArgs, false);
    default:
        exit(404);
}

function handleCommand(array $pathArgs, bool $isClient): void
{
    if ($_SERVER['REQUEST_METHOD'] !== "POST") {
        exit(405);
    }

    $entityBody = json_decode(file_get_contents("php://input"), true);
    if (sizeof($pathArgs) < 3 && !$isClient) {
        exit(400);
    }

    $client = buildClient($pathArgs[2]);
    $command = $entityBody["command"];
    if ($command == "close") {
        exit(200);
    }

    if (method_exists($client, $command)) {
        var_dump($entityBody);
        $params = parseParams($entityBody);
        var_dump($params);
        $resp = call_user_func_array([$client, $command], $params);
        echo json_encode($resp);
        exit(200);
    } else {
        echo "Method not found";
        exit(501);
    }
    //    if ($isClient) {
//        $client = buildClient($pathArgs[2]);
//        $client->
//        $command = $pathArgs[3];
//        $params = parseParams($entityBody);
//        $client->$command(...$params);
//        exit();
//    } else {
//        echo "CURRENTLY NOT SUPPORTED";
//        exit(500);
//    }
}

function handleSpec(): void
{
    echo json_encode(["name" => "PHP", "version" => "1.0.0", "capabilities" => ["LocalBucketing", "CloudBucketing", "Events"]]);
    exit(200);
}

function buildClient(string $clientId)
{
    $config = DevCycle\Configuration::getDefaultConfiguration()
        ->setApiKey('Authorization', getenv("DVC_SERVER_SDK_KEY"));
    //->setHost("http:/" . $clientId . "/v1")
    //->setUDSPath("/tmp/" . $clientId . ".sock");
    $options = new DevCycle\Model\DVCOptions(false);
    return new DevCycle\Api\DVCClient(
        $config,
        dvcOptions: $options
    );
}

function parseParams($entityBody): array
{
    $ret = array();
    foreach ($entityBody["params"] as $p) {
        $type = in_array("type", $p) ? $p["type"] : null;
        $value = in_array("value", $p) ? $p["value"] : null;
        if ($type == null) {
            if ($value != null) {
                $ret[] = $p["value"];
            }
        } else {
            if ($p["type"] == "user") {
                $user = new DevCycle\Model\UserData();
                $user->setUserId($entityBody["user"]["user_id"]);
                $user->setCustomData($entityBody["user"]["customData"]);
                $ret[] = $user;
            } elseif ($p["type"] == "event") {
                $event = new DevCycle\Model\Event();
                $event->setTarget($entityBody["event"]["target"]);
                $event->setType($entityBody["event"]["type"]);

                $ret[] = $event;
            }
        }
    }
    return $ret;
}