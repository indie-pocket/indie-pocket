update-version:
	@REL=$$( grep version package.json | head -n 1 | sed -e "s/.*: .\(.*\).,/\1/" ) && \
	RELCODE=$${REL//\./} && \
	perl -pi -e "s/(versionName=\").*\"/\$${1}$$REL\"/" App_Resources/Android/src/main/AndroidManifest.xml && \
	perl -pi -e "s/(versionCode=\").*\"/\$${1}$$RELCODE\"/" App_Resources/Android/src/main/AndroidManifest.xml && \
	perl -0pi -e "s:(<key>CFBundleVersion</key>.*?<string>).*?</:\$${1}$$REL</:s" App_Resources/iOS/Info.plist && \
	perl -pi -e "s/Version =.*/Version = \"$$REL\";/" src/lib/global.ts

android-compile: update-version
	[ -n "$$INDIE_POCKET_ANDROID_PASS" ]
	@tns build android --key-store-path indie-pocket-dev.jks --key-store-password $$INDIE_POCKET_ANDROID_PASS \
		--key-store-alias indiePocket --key-store-alias-password $$INDIE_POCKET_ANDROID_PASS --release
	@echo "Build successful - apk is at platforms/android/app/build/outputs/apk/release/app-release.ap"

android-release-copy:
	@mkdir -p releases && \
	REL=$$( grep versionName App_Resources/Android/src/main/AndroidManifest.xml | sed -e "s:.*\"\(.*\)\".*:\1:" ) && \
	cp -n platforms/android/app/build/outputs/apk/release/app-release.apk releases/indiePocket.$$REL.apk

android-release: android-compile android-release-copy

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
	xcodebuild -workspace platforms/ios/indiepocket.xcworkspace -scheme mobile -destination generic/platform=iOS archive -archivePath `pwd`/platforms/ios/build/indiepocket.xcarchive
	xcodebuild -exportArchive -archivePath `pwd`/platforms/ios/build/indiepocket.xcarchive -exportOptionsPlist App_Resources/iOS/ExportOptions.plist -exportPath `pwd`/platforms/ios/build

xcode-dev: ios-dev
	open platforms/ios/indiepocket.xcworkspace/

release: android-compile android-release-copy ios-prepare
	open platforms/ios/indiepocket.xcworkspace/
