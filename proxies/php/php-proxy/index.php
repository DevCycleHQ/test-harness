<?php

use DevCycle\Model\UserData;
use JetBrains\PhpStorm\NoReturn;

require_once(__DIR__ . '/vendor/autoload.php');

$pathArgs = explode('/', getenv('REQUEST_URI'));

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
    if ($_SERVER['REQUEST_METHOD'] !== "POST")
    {
        exit(405);
    }

    $entityBody = json_decode(file_get_contents('php://input'));
    if (sizeof($pathArgs) < 3 && !$isClient )
    {
        exit(400);
    }
    echo "Path: $pathArgs[1]\n";
    echo "IsClient: $isClient\n";
    $command = $pathArgs[2];
    echo "Command: $command\n";
    var_dump($entityBody);
    exit();
}

#[NoReturn] function handleSpec(): void
{
    echo json_encode(["name" => "PHP", "version" => "1.0.0", "capabilities" => ["LocalBucketing", "CloudBucketing", "Events"]]);
    exit();
}