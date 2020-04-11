# Classify app

classifier.h/.cpp is dependent for the eigen library. To get it automatically
after you cloned this repository, runs these two commands:
git submodule init
git submodule update

The Android app itself is dependent from the Qt 5 library, but this is not the
case of classifier.h/.cpp.