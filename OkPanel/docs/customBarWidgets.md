# Creating custom bar widgets

You can create a custom bar widget using one of the custom bar widget slots.
See [here](https://johnoberhauser.github.io/OkPanel/config/#barwidgetscustom1)
for configuration details.

Use execOnInit and/or execOnClick to run your own scripts when the widget is created or clicked.

You can update the label of the widget using the CLI.  e.g.

```
okpanel custom 1 "Hello"
```

## Example: Cpu usage indicator

In your configuration file:

```yaml
topBar:
  rightWidgets:
    - custom1

barWidgets:
  custom1:
    execOnInit: "/home/john/scripts/cpuScript.sh"
```

The `cpuScript.sh` (make sure it's executable).

This script loops every 5 seconds and reads the current cpu usage percentage.  It then updates the custom1 bar widget label.

```shell
while :; do
  percent=$(vmstat 1 2 | tail -1 | awk '{ printf("%.1f", 100 - $15) }')
  okpanel custom 1 "  $percent%"
  sleep 5
done
```