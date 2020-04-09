# How to release a new version

Once a new version is ready, these are the steps to take:

1. Test the version in both iOS and Android, as well on the simulator as on real devices:
    a) start with `tns run android` and `tns run ios`
    b) then use `tns run android` while an android phone is plugged in and the emulator is not running
    c) then use `tns run ios --device your_device_id` to run it on iOS
2. Test the update to the new version
    a) update the version in package.json
    b) install the previous staging-version on android and iOS
    c) run `make release-staging`
    d) check that the version is correctly updated and still runs on both devices
3. Update to the production version
    a) install the previous production-version on android and iOS
    b) run `make release-production`
    c) check that the version is correctly updated
    d) remove and install the version on both iOS and android
    e) publish to store 
