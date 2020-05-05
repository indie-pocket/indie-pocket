#include <jni.h>
#include <string>
#include <vector>

#include "classifier.h"

using namespace std;

vector<double> fromJavaArray(jdoubleArray array, JNIEnv* env);

Classifier classifier;

extern "C" JNIEXPORT void JNICALL
Java_ch_epfl_indiepocket_classifier_AnalysisService_setTrainingData(
        JNIEnv* env,
        jobject /* this */,
        jstring calibFileContent) {

    // Convert the Java String to std::string.
    string cppLabel(env->GetStringUTFChars(calibFileContent, nullptr));

    // Classify.
    classifier.setTrainingData(cppLabel);
}

extern "C" JNIEXPORT jstring JNICALL
Java_ch_epfl_indiepocket_classifier_AnalysisService_classify(
        JNIEnv* env,
        jobject /* this */,
        jdoubleArray axSignal,
        jdoubleArray aySignal,
        jdoubleArray azSignal) {

    // Convert the Java arrays to C++ arrays.
    vector<double> axSignalVec(fromJavaArray(axSignal, env));
    vector<double> aySignalVec(fromJavaArray(aySignal, env));
    vector<double> azSignalVec(fromJavaArray(azSignal, env));

    // Classify.
    string result = classifier.classify({axSignalVec, aySignalVec, azSignalVec});
    return env->NewStringUTF(result.c_str());
}

vector<double> fromJavaArray(jdoubleArray array, JNIEnv* env) {
    int size = env->GetArrayLength(array);
    double *address = env->GetDoubleArrayElements(array, nullptr);

    vector<double> arrayVec(address, address + size);

    env->ReleaseDoubleArrayElements(array, address, JNI_ABORT);

    return arrayVec;
}
