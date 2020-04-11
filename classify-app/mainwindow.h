#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QAccelerometer>
#include <QGyroscope>
#include <QLightSensor>
#include <QTimer>
#include <QSoundEffect>
#include <QtAndroid>
#include <QAndroidJniEnvironment>

#include "classifier.h"

QT_BEGIN_NAMESPACE
namespace Ui { class MainWindow; }
QT_END_NAMESPACE

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

public slots:
    void processReadings();
    void startTrainingCountdown();

private:
    void classifyCurrentState();
    void saveRawSamples();
    void saveTrainingData(PcaSet pcaSet);
    void androidPartialWakeLock();

    Ui::MainWindow *ui;

    QAccelerometer *accelerometer;
    QGyroscope *gyroscope;
    QLightSensor *lightSensor;

    QTimer trainingStartCountdown;

    std::vector<double> samplesTime,
                        samplesAX, samplesAY, samplesAZ,
                        samplesGX, samplesGY, samplesGZ,
                        samplesLux;

    QString currentTrainingLabel;
    Classifier classifier;

    QSoundEffect startBeep, endBeep;
    QAndroidJniObject wakeLock;
};
#endif // MAINWINDOW_H
