# homebridge-ifttt
Homebridge plugin for IFTTT Maker Channel

# Installation
Follow the instruction in [homebridge](https://www.npmjs.com/package/homebridge) for the
homebridge server installation.
The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-ifttt) and
should be installed "globally" by typing:

    npm install -g homebridge-ifttt

# Configuration
Remember to configure the plugin in config.json in your home directory inside the
.homebridge directory.

Look for a sample config in 
[config.json example](https://github.com/ilcato/homebridge-ifttt/blob/master/config.json).


See [IFTTT Maker Channel](https://ifttt.com/maker) for an explanation on how to configure
an IFTTT recipe with a Maker Channel.

You need to put the IFTTT Maker channel key in the configuration file and define a set of
Buttons.

If you specify both "triggerOn" and "triggerOff" values to a button configuration it will
generate different triggers for the two different status of the switch.

If you only specify the "trigger" value to a button configuration it will behave like a
push button generating the trigger after the selection of the button and automatically
returning to the off status.


Every button, once pressed with an Homekit app or via Siri, will generate an IFTTT trigger
on the Maker channel.


