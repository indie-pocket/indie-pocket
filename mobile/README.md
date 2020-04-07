# Indie-Pocket

TLDR: Download and participate on https://ineiti.applivery.io/indie-pocket

DevPost: https://devpost.com/software/pd4pepp-pt-aka-indie-pocket-proposal.

## Purpose

Collecting and labelling data for the ML training to detect where on your body the phone is carried.
The ML training needs a lot of correctly labeled data of the phones sensors.
The sensors used are (if available):
- timestamp in milliseconds
- accelerometer
- gyroscope (not available on old phones)
- light sensor (not available on iPhones)
- pedometer
- barometer (not available on old phones)

The app doesn't collect any GPS data.

## Uploading of data

When the user chooses to upload the data, all values are sent to a central server.
The current configuration of the app sends everything to a server located at EPFL, Lausanne, Switzerland.
In addition to the sensor data, the following is sent:

- app-version
- unique user-ID (which is chosen randomly on the first startup)
- phone type (os, os-version, brand, model)

No additional data like phone-#, IMEI, contact addresses or else is sent to the server.
The server doesn't store the IP addresses of the uploaded data.

## Next steps

For the app, here is what we'd like to do next:
- implement the ML algorithm on the phone
  - verify if it works
  - allow the users to give feedback on the recognition of gestures
- add "feedback message" to the app
- finish cleanup of the code

## Open Source

As all this uses Open Source, we'd like to give back to the following projects:

- create a nativescript-sensor package that includes all available sensors
- patch nativescript-sqlite with an index.js so the compilation doesn't complain
