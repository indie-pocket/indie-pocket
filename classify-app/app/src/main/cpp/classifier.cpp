#include "classifier.h"

#include <fstream>
#include <iostream>
#include <limits>
#include <numeric>

#include "redsvd/RedSVD.h"

using namespace std;
using namespace Eigen;

const int BIN_SIZE = 2501;

/*struct TrainingSamplesSetInternal
{
    vector<VectorXd> ffts;
    std::string label;
};*/

Classifier::Classifier() :
    locationStrings({"On table.", "In hand.", "Against head", "Front pocket.",
                     "Back Pocket.", "Front jacket pocket.",
                     "Handbag", "Backpack"})
{

}

/*TrainingData Classifier::train(std::vector<TrainingSamplesSet> trainingSets)
{
    // Compute the FFTs.
    vector<TrainingSamplesSetInternal> ffts(trainingSets.size());

    for(unsigned int i=0; i<trainingSets.size(); i++)
    {
        // Build Eigen vectors from std vectors.
        vector<VectorXd> samples(nInputs);

        for(int j=0; j<nInputs; j++)
            samples[j] = toEigenVector(trainingSets[i].channels[j]);

        // Compute the FFTs.
        ffts[i].ffts.resize(nInputs);

        for(int j=0; j<nInputs; j++)
            ffts[i].ffts[j] = fft(samples[j]);
    }

    // Concatenate all the sets together.
    int vectorsLength = ffts.front().ffts.front().size();
    MatrixXd combinedFfts(vectorsLength * nInputs, ffts.size());

    for(int i=0; i < nInputs; i++)
    {
        int startRow = i * vectorsLength;

        for(int column=0; column < combinedFfts.cols(); column++)
            combinedFfts.block(startRow, column, vectorsLength, 1) = ffts[column].ffts[i];
    }

    // Compute the principal components.
    combinedFfts = combinedFfts.transpose().eval();
    trainingData.centeringOffset = combinedFfts.colwise().mean();
    MatrixXd centered = combinedFfts.rowwise() - trainingData.centeringOffset;
    cout << centered.rows() << " " << centered.cols() << endl;
    //centered = centered.eval() * centered.transpose().eval();
    centered = centered.transpose().eval() * centered.eval();
    cout << centered.rows() << " " << centered.cols() << endl;

    RedSVD::RedSVD<MatrixXd> svd(centered, pcDims);
    MatrixXd coefs = svd.matrixU();

    // Sort the principal components by descending std of the scores.
//    MatrixXd scores = centered * coefs;
//    MatrixXd coefsSorted(coefs.rows(), coefs.cols());
//    vector<int> coefsOrderIndices = sortIndicesDescending(columnWiseStd(scores).transpose());

//    for(int i=0; i<coefs.cols(); i++)
//        coefsSorted.col(i) = coefs.col(coefsOrderIndices[i]);

//    cout << coefsSorted << endl;
    MatrixXd coefsSorted = coefs;

    // Keep only the desired amount of PC vectors (dimension of the base).
    //coefsSorted.conservativeResize(NoChange, pcDims);

    // Save the PCA coefficients.
    trainingData.v = coefsSorted;

    // Project the training FFTs on the PC.
    trainingData.trainingConditions.resize(trainingSets.size());

    //centered = combinedFfts.rowwise() - trainingData.centeringOffset; // CENTERING STEP.

    for(unsigned int i=0; i<trainingData.trainingConditions.size(); i++)
    {
        RowVectorXd pFft(vectorsLength * nInputs);

        for(int j=0; j<nInputs; j++)
            pFft.segment(j*vectorsLength, vectorsLength) = ffts[i].ffts[j].transpose();

        trainingData.trainingConditions[i].b = (pFft - trainingData.centeringOffset) * trainingData.v;
        //trainingData.trainingConditions[i].label = trainingSets[i].label;
    }

    return trainingData;
}*/

void Classifier::setTrainingData(string fileContent)
{
    // Read the file content line-by-line.
    istringstream iss(fileContent);
    string line;

    // Get the sizes and resize the matrices.
    getline(iss, line); // Skip label.
    getline(iss, line);

    int nSamples, nTrainingConditions;

    {
        istringstream iss(line);
        iss >> nSamples >> pcDims >> nTrainingConditions;
        nInputs = nSamples / BIN_SIZE;
    }

    trainingData.v.resize(nSamples, pcDims);
    trainingData.trainingConditions.resize(nTrainingConditions);
    trainingData.centeringOffset.resize(nSamples);

    cout << nSamples << " " << pcDims << " " << nTrainingConditions << endl;

    // Read coeff.
    getline(iss, line); // Skip label.

    for(int i=0; i<nSamples; i++)
    {
        getline(iss, line);

        istringstream iss(line);

        for(int j=0; j<pcDims; j++)
            iss >> trainingData.v(i, j);
    }

    // Read centering offset vector.
    {
        getline(iss, line); // Skip label.
        getline(iss, line);

        istringstream iss(line);

        for(int j=0; j<nSamples; j++)
            iss >> trainingData.centeringOffset(j);
    }

    // Read the training conditions.
    getline(iss, line); // Skip label.

    for(int i=0; i<nTrainingConditions; i++)
    {
        getline(iss, line);

        istringstream iss(line);

        // Read the projection on PCA.
        trainingData.trainingConditions[i].b.resize(pcDims);

        for(int j=0; j<pcDims; j++)
            iss >> trainingData.trainingConditions[i].b(j);

        // Read label.
        int conditionIndex;
        iss >> conditionIndex;
        trainingData.trainingConditions[i].label = conditionIndex;
    }
}

string Classifier::classify(const vector<vector<double>> &signals)
{
    if(trainingData.trainingConditions.size() < 2)
        return "Need at least two training datasets.";

    // Build Eigen vectors from std vectors.
    vector<VectorXd> samples(nInputs);

    for(int i=0; i<nInputs; i++)
        samples[i] = toEigenVector(signals[i]);

    // Compute the FFTs.
    int vectorsLength = signals.front().size();
    RowVectorXd ffts(vectorsLength * nInputs);

    for(int i=0; i<nInputs; i++)
        ffts.segment(i*vectorsLength, vectorsLength) = fft(samples[i]).transpose();

    // Project the spectrums on the PC axes.
    VectorXd b = (ffts - trainingData.centeringOffset) * trainingData.v;

    // For each sample, find the nearest neighbour in the training datasets.
    int closestTrainingDatasetIndex = -1;
    double shortestDistance2 = numeric_limits<double>::max();

    for(unsigned int j=0; j<trainingData.trainingConditions.size(); j++)
    {
        VectorXd trainingB = trainingData.trainingConditions[j].b;

        double dist2 = (trainingB - b).squaredNorm();

        if(dist2 < shortestDistance2)
        {
            shortestDistance2 = dist2;
            closestTrainingDatasetIndex = j;
        }
    }

    return locationStrings[trainingData.trainingConditions[closestTrainingDatasetIndex].label-1];
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

VectorXd Classifier::toEigenVector(std::vector<double> arr)
{
    return Map<const VectorXd,Unaligned>(arr.data(), arr.size());
}

double Classifier::stdDev(ArrayXd vec)
{
    return sqrt((vec - vec.mean()).square().sum() / (vec.size()-1));
}

MatrixXd Classifier::columnWiseStd(MatrixXd mat)
{
    MatrixXd std(1, mat.cols());

    for(int col=0; col<mat.cols(); col++)
        std(0,col) = stdDev(mat.col(col));

    return std;
}

vector<int> Classifier::sortIndicesDescending(VectorXd v)
{
    vector<int> indices(v.size());
    iota(indices.begin(), indices.end(), 0);

    sort(indices.begin(), indices.end(),
         [&v](int a, int b) {return v[a] > v[b];});

    return indices;
}
