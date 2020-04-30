#ifndef CLASSIFIER_H
#define CLASSIFIER_H

#include <array>
#include <vector>
#include <string>

// Prevents bogus warnings: https://gcc.gnu.org/bugzilla/show_bug.cgi?id=89325.
#pragma GCC diagnostic ignored "-Wattributes"

#include "eigen/Eigen/Dense"
#include "eigen/unsupported/Eigen/FFT"
#include "eigen/Eigen/Eigenvalues"

struct TrainingSamplesSet
{
    std::vector<std::vector<double>> channels; // Raw sensors channels: ax, ay, az, gx, gy, gz, lux, etc.
    std::string label;
};

struct TrainingConditionData
{
    Eigen::VectorXd b; // Vector of the sensors channels FFT, projected on v: b1, b2, b3, etc. Size pcDims.
    int label;
};

struct TrainingData
{
    Eigen::MatrixXd v; // Column vectors of the principal components: v1, v2, v3, etc. Size nInputs x pcDims.
    std::vector<TrainingConditionData> trainingConditions;
    Eigen::RowVectorXd centeringOffset;
};

class Classifier
{
public:
    Classifier();
    void setTrainingData(std::string fileContent);

    std::string classify(const std::vector<std::vector<double>> &signals);

private:
    static Eigen::VectorXd fft(Eigen::VectorXd &signal);
    static Eigen::VectorXd toEigenVector(std::vector<double> arr);
    static double stdDev(Eigen::ArrayXd vec);
    static Eigen::MatrixXd columnWiseStd(Eigen::MatrixXd mat);
    static std::vector<int> sortIndicesDescending(Eigen::VectorXd v);

    TrainingData trainingData;

    int nInputs, ///< number of input channels (ax, ay, az, gx, gy, gz, lux, etc.).
        pcDims; ///< number of principal component vectors (number of columns in the coefs matrix)

    const std::vector<std::string> locationStrings;
};

#endif // INDIEPOCKETCLASSIFIER_H
