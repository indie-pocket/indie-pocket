#include "mainwindow.h"
#include "ui_mainwindow.h"

#include <QFile>
#include <QDir>
#include <QTextStream>
#include <QDateTime>
#include <QMessageBox>
#include <QInputDialog>
#include <QDebug>

const QString LOGFILES_DIR("logs");

const int BIN_SIZE = 2500; // [samples].
const int TRAINING_COUNTDOWN_TIME = 5000; // [ms].

const QTime START_TIME(QTime::currentTime());

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::MainWindow)
{
    ui->setupUi(this);

    // TODO: load the previously generated training data.

    // Setup the sensors.
    QList<QByteArray> sensors = QSensor::sensorTypes();

    /*QString text("Sensors type:\n");

    for(auto s : sensors)
        text += QString(s) + " " + "\n";

    ui->infoLabel->setText(text);*/

    accelerometer = new QAccelerometer();
    gyroscope = new QGyroscope();
    lightSensor = new QLightSensor();

    /*auto dataRates = accelerometer->availableDataRates();
    QString txt;
    for(auto rate : dataRates)
    {
        txt += QString("[%1 %2]\n").arg(rate.first).arg(rate.second);
    }

    txt += QString("current: ") + accelerometer->dataRate();
    ui->infoLabel->setText(txt);*/

    accelerometer->setDataRate(500);
    accelerometer->start();
    connect(accelerometer, SIGNAL(readingChanged()), this, SLOT(processReadings()));

    gyroscope->setDataRate(500);
    gyroscope->start();

    lightSensor->setDataRate(10);
    lightSensor->start();

    //
    trainingStartCountdown.setSingleShot(true);
    trainingStartCountdown.setInterval(5000);

    connect(ui->startTrainingButton, SIGNAL(clicked(bool)),
            this, SLOT(startTrainingCountdown()));

    // Setup the sound.
    QAndroidJniObject jactivity = QtAndroid::androidActivity();
    if(jactivity.isValid())
        jactivity.callMethod<void>("setVolumeControlStream", "(I)V", 3); // Set the multimedia volume active.

    startBeep.setSource(QUrl::fromLocalFile(":/media/beep_880hz.wav"));
    startBeep.setLoopCount(0);
    endBeep.setSource(QUrl::fromLocalFile(":/media/beep_440hz.wav"));
    endBeep.setLoopCount(0);

    connect(&trainingStartCountdown, SIGNAL(timeout()),
            &startBeep, SLOT(play()));

    // Enable partial wake lock, to keep recording while the screen is off.
    androidPartialWakeLock();
}

MainWindow::~MainWindow()
{
    //if(wakeLock.isValid())
    //    wakeLock.callMethod<void>("release", "()V");

    delete ui;
}

void MainWindow::processReadings()
{
    if(gyroscope->reading() == nullptr || lightSensor->reading() == nullptr)
        return;

    qreal ax = accelerometer->reading()->x();
    qreal ay = accelerometer->reading()->y();
    qreal az = accelerometer->reading()->z();

    qreal gx = gyroscope->reading()->x();
    qreal gy = gyroscope->reading()->y();
    qreal gz = gyroscope->reading()->z();

    qreal lux = lightSensor->reading()->lux();

    if(!trainingStartCountdown.isActive())
    {
        samplesTime.push_back(-QTime::currentTime().msecsTo(START_TIME));
        samplesAX.push_back(ax);
        samplesAY.push_back(ay);
        samplesAZ.push_back(az);
        samplesGX.push_back(gx);
        samplesGY.push_back(gy);
        samplesGZ.push_back(gz);
        samplesLux.push_back(lux);

        if(samplesAX.size() >= BIN_SIZE)
        {
            if(currentTrainingLabel.isEmpty())
            {
                saveRawSamples();
                classifyCurrentState();
            }
            else
            {
                PcaSet pcaSet = classifier.addTrainingData(samplesAX,
                                                           samplesAY,
                                                           samplesAZ,
                                                           currentTrainingLabel.toStdString());
                saveTrainingData(pcaSet);
                currentTrainingLabel.clear();

                ui->infoLabel->setText("Training data acquisition done.");
                ui->startTrainingButton->setEnabled(true);
                endBeep.play();
            }

            samplesTime.clear();
            samplesAX.clear();
            samplesAY.clear();
            samplesAZ.clear();
            samplesGX.clear();
            samplesGY.clear();
            samplesGZ.clear();
            samplesLux.clear();
        }
    }

    //
    if(trainingStartCountdown.isActive())
        ui->infoLabel->setText("Starting training data acquisition in 5s...");
    else if(!currentTrainingLabel.isEmpty())
        ui->infoLabel->setText("Training data acquisition in progress.");

    // Debug display.
    ui->sampleLabel->setText(QString("%1 %2 %3\n%4 %5 %6\n%7").arg(ax).arg(ay).arg(az).arg(gx).arg(gy).arg(gz).arg(lux));
}

void MainWindow::startTrainingCountdown()
{
    QString activityName = QInputDialog::getText(this, qApp->applicationName(),
                                                 "Enter the activity name:");

    if(activityName.isEmpty())
        return;
    else
    {
        trainingStartCountdown.start(TRAINING_COUNTDOWN_TIME);
        currentTrainingLabel = activityName;

        samplesTime.clear();
        samplesAX.clear();
        samplesAY.clear();
        samplesAZ.clear();
        samplesGX.clear();
        samplesGY.clear();
        samplesGZ.clear();
        samplesLux.clear();

        ui->startTrainingButton->setEnabled(false);
    }
}

void MainWindow::classifyCurrentState()
{
    QString estimatedState = classifier.classify(samplesAX,
                                                 samplesAY,
                                                 samplesAZ).c_str();
    ui->infoLabel->setText("Current state: " + estimatedState);
}

void MainWindow::saveRawSamples()
{
    // Create the file.
    QFile file;
    QTextStream logStream;

    if(!QDir(LOGFILES_DIR).exists())
        QDir().mkdir(LOGFILES_DIR);

    file.setFileName(LOGFILES_DIR + "/raw_" + QDateTime::currentDateTime()
                     .toString("yyyy-MM-dd_HH_mm_ss") + ".csv");

    if(!file.open(QFile::WriteOnly))
        QMessageBox::warning(this, qApp->applicationName(), "Cannot create log file.");
    else
        logStream.setDevice(&file);

    // Write the header row, describing the variables.
    logStream << "t,ax,ay,az,gx,gy,gz,lux\n";

    for(unsigned int i=0; i<samplesTime.size(); i++)
    {
        logStream << samplesTime[i] << ","
                  << samplesAX[i] << "," << samplesAY[i] << "," << samplesAZ[i] << ","
                  << samplesGX[i] << "," << samplesGY[i] << "," << samplesGZ[i] << ","
                  << samplesLux[i] << "\n";
    }
}

void MainWindow::saveTrainingData(PcaSet pcaSet)
{
    // Create the file.
    QFile file;
    QTextStream logStream;

    if(!QDir(LOGFILES_DIR).exists())
        QDir().mkdir(LOGFILES_DIR);

    file.setFileName(LOGFILES_DIR + "/training_" + pcaSet.label.c_str() + "_" +
                     QDateTime::currentDateTime().toString("yyyy-MM-dd_HH_mm_ss") +
                     ".csv");

    if(!file.open(QFile::WriteOnly))
        QMessageBox::warning(0, qApp->applicationName(), "Cannot create log file.");
    else
        logStream.setDevice(&file);

    // Write the header row, describing the variables.
    logStream << "b1,b2,b3\n";

    for(int i=0; i<pcaSet.b1.size(); i++)
    {
        logStream << pcaSet.b1(i) << "," << pcaSet.b2(i) << "," << pcaSet.b3(i)
                  << "\n";
    }
}

void MainWindow::androidPartialWakeLock()
{
    QtAndroid::runOnAndroidThread([=]
    {
        QAndroidJniObject activity = QtAndroid::androidActivity();

        if(!activity.isValid())
        {
            qDebug() << "androidPartialWakeLock(): activity not valid.";
            return;
        }

        QAndroidJniObject powerManager;
        powerManager = activity.callObjectMethod("getSystemService",
                                                 "(Ljava/lang/String;)Ljava/lang/Object;",
                                                  QAndroidJniObject::fromString("power").object<jstring>());

        if(!powerManager.isValid())
        {
            qDebug() << "androidPartialWakeLock(): PowerManager not valid." << endl;
            return;
        }

        const int PARTIAL_WAKE_LOCK = 1;

        wakeLock = powerManager.callObjectMethod("newWakeLock",
                                                 "(ILjava/lang/String;)Landroid/os/PowerManager$WakeLock;",
                                                 PARTIAL_WAKE_LOCK,
                                                 QAndroidJniObject::fromString("indie-pocket-classifier").object<jstring>()); // 1=PARTIAL_WAKE_LOCK.

        if(!wakeLock.isValid())
        {
            qDebug() << "androidPartialWakeLock(): Wakelock not valid." << endl;
            return;
        }

        wakeLock.callMethod<void>("acquire", "()V");

        QAndroidJniEnvironment environment;

        if(environment->ExceptionCheck())
            environment->ExceptionClear();
    });
}

