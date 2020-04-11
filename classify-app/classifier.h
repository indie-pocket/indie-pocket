#ifndef CLASSIFIER_H
#define CLASSIFIER_H

#include <vector>
#include <string>

// Prevents bogus warnings: https://gcc.gnu.org/bugzilla/show_bug.cgi?id=89325.
#pragma GCC diagnostic ignored "-Wattributes"

#include <eigen/Eigen/Dense>
#include <eigen/unsupported/Eigen/FFT>
#include <eigen/Eigen/Eigenvalues>

struct PcaSet
{
    Eigen::VectorXd b1, b2, b3;
    std::string label;
};

class Classifier
{
public:
    Classifier();
    PcaSet addTrainingData(const std::vector<double> &axSignal,
                           const std::vector<double> &aySignal,
                           const std::vector<double> &azSignal,
                           std::string label);
    void clearTrainingData();
    std::string classify(const std::vector<double> &axSignal,
                         const std::vector<double> &aySignal,
                         const std::vector<double> &azSignal);

    static PcaSet pca(const std::vector<double> &axSignal,
                      const std::vector<double> &aySignal,
                      const std::vector<double> &azSignal);

private:
    static Eigen::VectorXd fft(Eigen::VectorXd &signal);

    std::vector<PcaSet> trainingPcaSets;
};

#endif // INDIEPOCKETCLASSIFIER_H
