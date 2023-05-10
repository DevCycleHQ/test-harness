<?php

var_dump(explode('/', getenv('REQUEST_URI')));
echo "<br>";
var_dump(explode('/', strtok(getenv('REQUEST_URI'), '?')));
