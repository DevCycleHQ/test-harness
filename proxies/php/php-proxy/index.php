<?php

use DevCycle\Api\DVCClient;
use JetBrains\PhpStorm\NoReturn;

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
#[NoReturn] function handleCommand(array $pathArgs, bool $isClient): void
{
    if ($_SERVER['REQUEST_METHOD'] !== "POST") {
        exit(405);
    }

    $entityBody = json_decode(file_get_contents('php://input'));
    if (sizeof($pathArgs) < 3 && !$isClient) {
        exit(400);
    }

    throw new Exception(var_export($entityBody, true));
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

#[NoReturn] function handleSpec(): void
{
    echo json_encode(["name" => "PHP", "version" => "1.0.0", "capabilities" => ["LocalBucketing", "CloudBucketing", "Events"]]);
    exit();
}

function buildClient($clientId): DVCClient
{
    $config = DevCycle\Configuration::getDefaultConfiguration()
        ->setApiKey('Authorization', "dvc_server_" . $clientId)
        ->setHost("http:/" . $clientId . "/v1")
        ->setUDSPath("/tmp/" . $clientId . ".sock");
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
        $param_type = $p["type"];
        $param_value = $p["value"];
        if ($param_type == null) {
            if ($param_value == null) {
                $ret[] = null;
            } else {
                $ret[] = $param_value;
            }
        } elseif ($param_type == "user") {
            $ret[] = $entityBody["user"];
        } elseif ($param_type == "event") {
            $ret[] = $entityBody["event"];
        }
    }
    return $ret;
}