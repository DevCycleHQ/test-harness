#!/bin/sh

/sidecar-manager &
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
