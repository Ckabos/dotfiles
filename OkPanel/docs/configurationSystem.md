# Configuration System

OkPanel supports flexible configuration with multiple .yaml files, allowing you to define global overrides and easily switch between themes or setups.

## Config File Locations

All config files are located in:

`~/.config/OkPanel/`

You can include any number of .yaml files in this directory.

## Default Value Resolution

Each configuration field has a built-in default. When a value is not explicitly defined, OkPanel resolves the value using the following priority:

1. Active config file (e.g., nord.yaml)

2. Global override file (okpanel.yaml)

3. Built-in default value (defined by the schema)

## Global Overrides

You can define shared settings in a global file:

`~/.config/OkPanel/okpanel.yaml`

This file acts as a fallback for all named configurations and is useful for setting values you want consistent across multiple themes or setups.

If you only define values in okpanel.yaml, and do not use any named configs, those values will apply globally.

## Non Global Configs

Other configuration files can be named anything except `okpanel.yaml`.  
If only one non global file is defined, that is the config that will be used.
If multiple non global files are defined, you can switch between them in the Look and Feels widget.


## No Config Files

If no configuration files are defined, then only the default values will be used.
