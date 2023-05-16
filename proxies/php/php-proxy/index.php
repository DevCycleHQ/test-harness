<?php

require_once(__DIR__ . '/vendor/autoload.php');
$pathArgs = [];
if (getenv("LOCAL_MODE") == "") {
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
}
else {
    handleCommand(["", "client", "clientName"], true);
}

function handleCommand(array $pathArgs, bool $isClient): void
{

    if (getenv("LOCAL_MODE")=="") {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            exit(405);
        }
        $entityBody = json_decode(file_get_contents('php://input'), true);
    }
    else {
        $entityBody = json_decode('{"params":[{"type":"user"},{"value":"string-var"},{"value":"defaultValue"}],"user":{"user_id":"user", "customData":{"should-bucket":true}},"command":"variable"}', true);
    }

    if (sizeof($pathArgs) < 3 && !$isClient) {
        exit(400);
    }

    $client = buildClient($pathArgs[2]);
    $command = $entityBody["command"];
    if ($command == "close") {
        echo "{}";
        exit(200);
    }

    if (method_exists($client, $command)) {
        $params = parseParams($entityBody);

        switch ($command) {
            case "variable":
                $user = $params[0];
                $variableKey = $params[1];
                $defaultValue = $params[2];
                $varr = $client->variable($user, $variableKey, $defaultValue);
                $resp = [
                    "data" => [
                        "defaultValue" => $defaultValue,
                        "isDefaulted" => $varr->getValue() == $defaultValue,
                        "value" => gettype($varr->getValue()) == "array" ? $varr->getValue()[0] : $varr->getValue(),
                        "key" => $variableKey,
                        "type" => converNumberType(ucwords(gettype($defaultValue)))
                    ],
                    "entityType" => "Variable",
                    "logs" => []
                ];
                echo json_encode($resp);
                exit(200);
        }
        //var_dump($entityBody);
        //var_dump($params);
        $resp = call_user_func_array([$client, $command], $params);
        $entityResponse = [];
        $entityResponse["data"] = $resp;
        $entityResponse["entityType"] = $command;
        echo json_encode($entityResponse);
        exit(200);
    } else {
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
        ->setApiKey('Authorization', getenv("LOCAL_MODE") == "" ? "dvc_server_".$clientId : "dvc_server_test-harness-config")
        ->setHost(getenv("LOCAL_MODE") == "" ?"http:/" . $clientId . "v1" : "http://localhost:8080")
        ->setUDSPath(getenv("LOCAL_MODE") == "" ? "/tmp/" . $clientId . ".sock" : "");
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
        $type = in_array("type", array_keys($p)) ? $p["type"] : null;
        $value = in_array("value", array_keys($p)) ? $p["value"] : null;
        if ($type == null) {
            if ($value != null) {
                $ret[] = $p["value"];
            }
        } else {
            if ($type == "user") {
                $user = new DevCycle\Model\UserData();
                $user->setUserId($entityBody["user"]["user_id"]);
                $user->setCustomData($entityBody["user"]["customData"]);
                $ret[] = $user;
            } elseif ($type == "event") {
                $event = new DevCycle\Model\Event();
                $event->setTarget($entityBody["event"]["target"]);
                $event->setType($entityBody["event"]["type"]);

                $ret[] = $event;
            }
        }
    }
    return $ret;
}

function converNumberType($val): string {
    switch($val) {
        case "Number":
        case "Integer":
        case "Float":
            return "Number";
        default:
            return $val;
    }
}