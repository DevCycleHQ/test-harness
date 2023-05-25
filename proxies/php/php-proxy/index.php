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
} else {
    handleCommand(["", "client", "clientName"], true);
}

function handleCommand(array $pathArgs, bool $isClient): void
{

    if (getenv("LOCAL_MODE") == "") {
        if ($_SERVER['REQUEST_METHOD'] !== "POST") {
            exit(405);
        }
        $entityBody = json_decode(file_get_contents('php://input'), true);
    } else {
        // user variable
        //$entityBody = json_decode('{"params":[{"type":"user"},{"value":"json-var"},{"value":{}}],"user":{"user_id":"user", "customData":{"should-bucket":true}},"command":"variable"}', true);
        // all variables
        $entityBody = json_decode('{"params":[{"type":"user"}],"user":{"user_id":"user", "customData":{"should-bucket":true}},"command":"allVariables"}', true);
    }

    if (sizeof($pathArgs) < 3 && !$isClient) {
        exit(400);
    }
    $clientId = $pathArgs[2];

    $client = buildClient($clientId);
    $command = $entityBody["command"];
    if ($command == "close") {
        $closeReq = curl_init();
        curl_setopt($closeReq, CURLOPT_URL, "http://localhost:3000/close/" . $clientId);
        curl_setopt($closeReq, CURLOPT_POST, 1);
        curl_exec($closeReq);
        curl_close($closeReq);
        exit(200);
    }

    if (method_exists($client, $command)) {
        $params = parseParams($entityBody);
        try {

            switch ($command) {
                case "variable":
                    $user = $params[0];
                    $variableKey = $params[1];
                    $defaultValue = gettype($params[2]) == "array" && sizeof(array_keys($params[2])) == 0 ? new ArrayObject() : $params[2];
                    $varr = $client->variable($user, $variableKey, $defaultValue);
                    $isDefaulted = $varr->getIsDefaulted();
                    $value = $varr->getValue();
                    $resp = [
                        "data" => [
                            "defaultValue" => $defaultValue,
                            "isDefaulted" => $isDefaulted,
                            "value" => $value,
                            "key" => $variableKey,
                            "type" => gettype($defaultValue) == "array" || gettype($defaultValue) == "object" ? "JSON"
                                : convertNativeTypes(ucwords(gettype($defaultValue)))
                        ],
                        "entityType" => "Variable",
                        "logs" => []
                    ];
                    echo json_encode($resp);
                    exit(200);
                case "allVariables":
                    $user = $params[0];
                    $resp = [
                        "data" => $client->allVariables($user),
                        "entityType" => "Object",
                        "logs" => []
                    ];
                    echo json_encode($resp);
                    exit(200);
                case "track":
                    $user = $params[0];
                    $event = $params[1];
                    $response = $client->track($user, $event);
                    echo json_encode($response);
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

        } catch (Exception $e) {
            $resp = [
                "exception" => $e->getMessage(),
                "statusCode" => 500
            ];
            echo json_encode($resp);
            exit(500);
        }
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
        ->setApiKey('Authorization', getenv("LOCAL_MODE") == "" ? "dvc_server_" . $clientId : "dvc_server_test-harness-config")
        ->setHost(getenv("LOCAL_MODE") == "" ? "http:/" . $clientId . "v1" : "http://localhost:8080")
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
        if ($type === null) {
            if ($value !== null) {
                $ret[] = $p["value"];
            } else {
                $ret[] = null;
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
                $event->setValue($entityBody["event"]["value"]);
                $ret[] = $event;
            }
        }
    }
    return $ret;
}

function convertNativeTypes($val): string
{
    switch ($val) {
        case "Number":
        case "Integer":
        case "Float":
            return "Number";
        case "Object":
        case "Array":
            return "JSON";
        case "String":
            return "String";
        case "Boolean":
            return "Boolean";
        default:
            return $val;
    }
}