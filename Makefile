
android-compile:
	[ -n "$$INDIE_POCKET_ANDROID_PASS" ]
	@tns build android --key-store-path indie-pocket-dev.jks --key-store-password $$INDIE_POCKET_ANDROID_PASS \
		--key-store-alias indiePocket --key-store-alias-password $$INDIE_POCKET_ANDROID_PASS --release
	@echo "Build successful - apk is at platforms/android/app/build/outputs/apk/release/app-release.ap"

android-release-copy:
	@mkdir -p releases && \
	REL=$$( grep versionName app/App_Resources/Android/src/main/AndroidManifest.xml | sed -e "s:.*\"\(.*\)\".*:\1:" ) && \
	cp -n platforms/android/app/build/outputs/apk/release/app-release.apk releases/indiePocket.$$REL.apk

android-release: roster-check apply-patches gradle-prod android-compile gradle-simul android-release-copy

android-release-32-copy:
	@mkdir -p releases && \
	REL=$$( grep versionName app/App_Resources/Android/src/main/AndroidManifest.xml | sed -e "s:.*\"\(.*\)\".*:\1:" ) && \
	cp -n platforms/android/app/build/outputs/apk/release/app-release.apk releases/indiePocket-32.$$REL.apk

android-release-32: gradle-simul roster-check apply-patches android-compile android-release-32-copy

release-key:
	if [ -e indie-pocket-dev.jks ]; then echo "Please remove indie-pocket-dev.jks first"; exit 1; fi
	keytool -genkey -v -storetype pkcs12 -keystore indie-pocket-dev.jks -keyalg RSA -keysize 4096 -validity 10000 -alias indiePocket

ios-prepare:
	tns prepare ios

ios-dev: ios-prepare

# To be able to use ios-release you need to first run a manual
# build once, which will use Xcode to download the signing profile.
ios-release: apply-patches
	tns prepare ios --release
	rm -rf platforms/ios/build
	xcodebuild -workspace platforms/ios/mobile.xcworkspace -scheme mobile -destination generic/platform=iOS archive -archivePath `pwd`/platforms/ios/build/mobile.xcarchive
	xcodebuild -exportArchive -archivePath `pwd`/platforms/ios/build/mobile.xcarchive -exportOptionsPlist app/App_Resources/iOS/ExportOptions.plist -exportPath `pwd`/platforms/ios/build

xcode-dev: ios-dev
	open platforms/ios/mobile.xcworkspace/

release: android-release-32 gradle-prod android-compile gradle-simul android-release-copy ios-prepare
	open platforms/ios/mobile.xcworkspace/
