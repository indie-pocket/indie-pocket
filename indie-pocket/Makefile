.DEFAULT_GOAL := release

STAGING = false

clean:
	rm -rf platforms node_modules hooks

node_modules:
	npm ci

sqlite: node_modules
	touch node_modules/nativescript-sqlite/index.js

update-version:
	@REL=$$( grep version package.json | head -n 1 | sed -e "s/.*: .\(.*\).,/\1/" ) && \
	RELCODE=$${REL//\./} && \
	perl -pi -e "s/(versionName=\").*\"/\$${1}$$REL\"/" App_Resources/Android/src/main/AndroidManifest.xml && \
	perl -pi -e "s/(versionCode=\").*\"/\$${1}$$RELCODE\"/" App_Resources/Android/src/main/AndroidManifest.xml && \
	perl -0pi -e "s:(<key>CFBundleVersion</key>.*?<string>).*?</:\$${1}$$REL</:s" App_Resources/iOS/Info.plist && \
	perl -pi -e "s/Version =.*/Version = \"$$REL\";/" src/lib/global.ts

prepare-files: update-version sqlite

android-compile: prepare-files
	[ -n "$$INDIE_POCKET_ANDROID_PASS" ]
	@tns build android --key-store-path indie-pocket-dev.jks --key-store-password $$INDIE_POCKET_ANDROID_PASS \
		--key-store-alias indiePocket --key-store-alias-password $$INDIE_POCKET_ANDROID_PASS --release
	@echo "Build successful - apk is at platforms/android/app/build/outputs/apk/release/app-release.ap"

android-release-copy:
	@mkdir -p releases && \
	REL=$$( grep versionName App_Resources/Android/src/main/AndroidManifest.xml | sed -e "s:.*\"\(.*\)\".*:\1:" ) && \
	if [ ${STAGING} = true ]; then REL=$$REL-staging; fi && \
	cp -n platforms/android/app/build/outputs/apk/release/app-release.apk releases/indiePocket.$$REL.apk

android-release: android-compile android-release-copy

release-key:
	if [ -e indie-pocket-dev.jks ]; then echo "Please remove indie-pocket-dev.jks first"; exit 1; fi
	keytool -genkey -v -storetype pkcs12 -keystore indie-pocket-dev.jks -keyalg RSA -keysize 4096 -validity 10000 -alias indiePocket

android-prepare: udpate-version
	tns prepare android

ios-prepare: update-version
	tns prepare ios

# To be able to use ios-release you need to first run a manual
# build once, which will use Xcode to download the signing profile.
# This does currently not work...
ios-release: update-version
	tns prepare ios --release
	rm -rf platforms/ios/build
	xcodebuild -workspace platforms/ios/indiepocket.xcworkspace -scheme mobile -destination generic/platform=iOS archive -archivePath `pwd`/platforms/ios/build/indiepocket.xcarchive
	xcodebuild -exportArchive -archivePath `pwd`/platforms/ios/build/indiepocket.xcarchive -exportOptionsPlist App_Resources/iOS/ExportOptions.plist -exportPath `pwd`/platforms/ios/build

xcode-open:
	open platforms/ios/indiepocket.xcworkspace/

xcode-dev: ios-prepare xcode-open

.PHONY: package-update app-sync release-staging release-production

package-update:
	perl -pi -e 's/"debug".*/"debug": false,/' package.json
	perl -pi -e 's/"staging".*/"staging": ${STAGING},/' package.json
	if [ ${STAGING} = true ]; then \
		perl -pi -e 's/"id":.*/"id": "ch.epfl.indiepocket.staging",/' package.json; \
	else \
		perl -pi -e 's/"id":.*/"id": "ch.epfl.indiepocket",/' package.json; \
	fi

app-sync:
	@if [ ${STAGING} = true ]; then \
		echo "Pushing updates to Staging"; \
		nativescript-app-sync release indiepocketAndroid android --targetBinaryVersion ~0.4.0 --d Staging; \
		nativescript-app-sync release indiepocketIOS ios --targetBinaryVersion ~0.4.0 --d Staging; \
	else \
		echo "Pushing updates to Production"; \
		nativescript-app-sync release indiepocketAndroid android --targetBinaryVersion ~0.4.0 --d Production; \
		nativescript-app-sync release indiepocketIOS ios --targetBinaryVersion ~0.4.0 --d Production; \
	fi

test-staging:
	if [ ${STAGING} = true ]; then \
		echo Staging; \
	fi

run-android-staging: STAGING = true
run-android-staging: update-version
	[ -n "$$INDIE_POCKET_ANDROID_PASS" ]
	perl -pi -e 's/"debug".*/"debug": true,/' package.json
	@tns run android --key-store-path indie-pocket-dev.jks --key-store-password $$INDIE_POCKET_ANDROID_PASS \
		--key-store-alias indiePocket --key-store-alias-password $$INDIE_POCKET_ANDROID_PASS --release

release-staging: STAGING = true
release-staging: clean package-update android-compile android-release-copy ios-prepare app-sync xcode-open

release-production: package-update android-compile android-release-copy app-sync xcode-dev
