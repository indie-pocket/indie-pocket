#include "classifier.h"

#include <fstream>
#include <iostream>
#include <limits>

#include <eigen/Eigen/Dense>
#include <eigen/unsupported/Eigen/FFT>
#include <eigen/Eigen/Eigenvalues>

using namespace std;
using namespace Eigen;

Classifier::Classifier()
{

}

PcaSet Classifier::addTrainingData(const vector<double> &axSignal,
                                   const vector<double> &aySignal,
                                   const vector<double> &azSignal,
                                   string label)
{
    PcaSet pcaSet = pca(axSignal, aySignal, azSignal);
    pcaSet.label = label;

    trainingPcaSets.push_back(pcaSet);

    return pcaSet;
}

void Classifier::clearTrainingData()
{
    trainingPcaSets.clear();
}

string Classifier::classify(const vector<double> &axSignal,
                            const vector<double> &aySignal,
                            const vector<double> &azSignal)
{
    if(trainingPcaSets.size() < 2)
        return "Need at least two training datasets.";

    // Principal components analyis.
    PcaSet pcaSet = pca(axSignal, aySignal, azSignal);

    // For each sample, find the nearest neighbour in the training datasets.
    vector<int> trainingSetsScores(trainingPcaSets.size(), 0.0);

    for(unsigned int i=0; i<axSignal.size(); i++)
    {
        int closestTrainingDatasetIndex = -1;
        double shortestDistance2 = numeric_limits<double>::max();

        for(unsigned int j=0; j<trainingPcaSets.size(); j++)
        {
            PcaSet &trainingPcaSet = trainingPcaSets[j];

            for(int k=0; k<trainingPcaSet.b1.size(); k++)
            {
                double dx = trainingPcaSet.b1[k] - pcaSet.b1[i];
                double dy = trainingPcaSet.b2[k] - pcaSet.b2[i];
                double dz = trainingPcaSet.b3[k] - pcaSet.b3[i];

                double distance2 = dx * dx + dy * dy + dz * dz;

                if(distance2 < shortestDistance2)
                {
                    shortestDistance2 = distance2;
                    closestTrainingDatasetIndex = j;
                }
            }
        }

        trainingSetsScores[closestTrainingDatasetIndex]++;
    }

    // Find the dataset with the highest score.
    int bestIndex = distance(trainingSetsScores.begin(),
                             max_element(trainingSetsScores.begin(),
                                         trainingSetsScores.end()));

    //cout << "Score: " << trainingSetsScores[bestIndex] << "/"
    //     << axSignal.size() << endl;

    return trainingPcaSets[bestIndex].label;
}

PcaSet Classifier::pca(const vector<double> &axSignal,
                       const vector<double> &aySignal,
                       const vector<double> &azSignal)
{
    // Build Eigen vectors from std vectors.
    VectorXd axSamples = Map<const VectorXd,Unaligned>(axSignal.data(),
                                                       axSignal.size());
    VectorXd aySamples = Map<const VectorXd,Unaligned>(aySignal.data(),
                                                       aySignal.size());
    VectorXd azSamples = Map<const VectorXd,Unaligned>(azSignal.data(),
                                                       azSignal.size());

    // Compute the FFTs.
    VectorXd axFft = fft(axSamples);
    VectorXd ayFft = fft(aySamples);
    VectorXd azFft = fft(azSamples);

    // Concatenate in a single matrix.
    MatrixXd accFft(axFft.size(), 3);
    accFft << axFft, ayFft, azFft;

    // Compute principal components.
    MatrixXd centered = accFft.rowwise() - accFft.colwise().mean();
    MatrixXd cov = (centered.adjoint() * centered) / double(accFft.rows() - 1);

    EigenSolver<MatrixXd> solver(cov, true);
    //cout << "eigenvectors: " << endl
    //     << solver.eigenvectors() << endl;

    VectorXd v1(solver.eigenvectors().row(0).real().transpose());
    VectorXd v2(solver.eigenvectors().row(1).real().transpose());
    VectorXd v3(solver.eigenvectors().row(2).real().transpose());

    // Project samples on eigenvectors.
    VectorXd b1(axSamples.size());
    VectorXd b2(aySamples.size());
    VectorXd b3(azSamples.size());

    for(unsigned int i=0; i<axSignal.size(); i++)
    {
        Vector3d s(axSamples(i), aySamples(i), azSamples(i));
        b1(i) = s.dot(v1);
        b2(i) = s.dot(v2);
        b3(i) = s.dot(v3);
    }

    // Temp: save to file.
    /*ofstream outFile("classification.csv");
    for(int i=0; i<b1.size(); i++)
        outFile << b1(i) << "," << b2(i) << "," << b3(i) << "\n";*/

    //
    PcaSet pcaSet = {b1, b2, b3, ""};
    return pcaSet;
}

VectorXd Classifier::fft(VectorXd &signal)
{
    VectorXcd complexSpectrum(signal.size());
    VectorXd spectrum(signal.size());

    FFT<double> fft;
    complexSpectrum = fft.fwd(signal);
    spectrum = complexSpectrum.cwiseAbs();

    return spectrum;
}
