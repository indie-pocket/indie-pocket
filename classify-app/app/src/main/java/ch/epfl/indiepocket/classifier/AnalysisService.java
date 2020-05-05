package ch.epfl.indiepocket.classifier;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.TaskStackBuilder;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.concurrent.atomic.AtomicInteger;

public class AnalysisService extends Service {

    enum LoggingState {
        IDLE,
        CLASSIFY,
        TRAIN
    }

    private static final String CHANNEL_ID = "indie-pocket-notification";
    private static final int SERVICE_ID = 3333;
    private static final int SAMPLES_SET_SIZE = 2501;
    private static boolean running;

    private TextToSpeech tts;
    private Thread classifyThread;
    public static AnalysisService instance;
    private SensorManager sensorManager;
    private Sensor accelerometer, gyroscope, lightSensor;
    private SensorEventListener sensorListener;
    private PowerManager.WakeLock wakeLock;
    private double[] lastAccelValues, lastGyroValues;
    private double lastLuxValue;

    private double[] tSamples, axSamples, aySamples, azSamples, gxSamples, gySamples, gzSamples, luxSamples;
    private AtomicInteger nSamplesCollected;

    // Used to load the 'native-lib' library on application startup.
    static {
        System.loadLibrary("native-lib");
    }

    @Override
    public void onCreate() {
        super.onCreate();

        instance = this;
        running = false;
        tSamples = new double[SAMPLES_SET_SIZE];
        axSamples = new double[SAMPLES_SET_SIZE];
        aySamples = new double[SAMPLES_SET_SIZE];
        azSamples = new double[SAMPLES_SET_SIZE];
        gxSamples = new double[SAMPLES_SET_SIZE];
        gySamples = new double[SAMPLES_SET_SIZE];
        gzSamples = new double[SAMPLES_SET_SIZE];
        luxSamples = new double[SAMPLES_SET_SIZE];
        nSamplesCollected = new AtomicInteger();
        lastAccelValues = new double[3];
        lastGyroValues = new double[3];

        // Init speech engine.
        tts = new TextToSpeech(this, new TextToSpeech.OnInitListener() {
            @Override
            public void onInit(int status) {
                if(status != TextToSpeech.SUCCESS)
                    Log.e(MainActivity.TAG, "Could not initialize speech.");
            }
        });

        // Init sensors.
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        gyroscope = sensorManager.getDefaultSensor(Sensor.TYPE_GYROSCOPE);
        lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PROXIMITY);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // From https://developer.android.com/training/notify-user/build-notification#Priority
        // Create the NotificationChannel, but only on API 26+ because
        // the NotificationChannel class is new and not in the support library
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "indie-pocket-notification-channel";
            String description = "Indie-Pocket notification channel for continuous logging.";
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            // Register the channel with the system; you can't change the importance
            // or other notification behaviors after this
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }

        // Create the notification.
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID);

        // From https://developer.android.com/training/notify-user/navigation#build_a_pendingintent_with_a_back_stack
        // Create an Intent for the activity you want to start
        Intent resultIntent = new Intent(this, MainActivity.class);
        // Create the TaskStackBuilder and add the intent, which inflates the back stack
        TaskStackBuilder stackBuilder = TaskStackBuilder.create(this);
        stackBuilder.addNextIntentWithParentStack(resultIntent);
        // Get the PendingIntent containing the entire back stack
        PendingIntent resultPendingIntent =
                stackBuilder.getPendingIntent(0, PendingIntent.FLAG_UPDATE_CURRENT);

        b.setOngoing(true)
                .setSmallIcon(android.R.drawable.star_on)
                .setContentTitle("Indie-pocket active.")
                .setContentText("Indie-Pocket is analyzing your movements.")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(resultPendingIntent)
                .setAutoCancel(false);

        startForeground(SERVICE_ID,
                b.build());

        running = true;

        // Load the calibration file.
        try {
            BufferedInputStream fis = new BufferedInputStream(getResources().openRawResource(R.raw.calib));
            BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
            String line;
            StringBuilder text = new StringBuilder();
            while (( line = reader.readLine()) != null) {
                text.append(line);
                text.append('\n');
            }

            setTrainingData(text.toString()); // Give the content of this file to the classifier.
        } catch (IOException e) {
            Log.e(MainActivity.TAG, "Could not open the calibration file.");
            e.printStackTrace();
        }

        // Start recording the sensors.
        nSamplesCollected.set(0);

        sensorListener = new SensorEventListener() {
            @Override
            public void onSensorChanged(SensorEvent sensorEvent) {
                if(sensorEvent.sensor == accelerometer) {
                    for(int i=0; i<3; i++)
                        lastAccelValues[i] = sensorEvent.values[i];
                }
                else if(sensorEvent.sensor == gyroscope) {
                    for(int i=0; i<3; i++)
                        lastGyroValues[i] = sensorEvent.values[i];
                }
                else
                    lastLuxValue = sensorEvent.values[0];

                if(sensorEvent.sensor == accelerometer &&
                   nSamplesCollected.get() < SAMPLES_SET_SIZE)
                {
                    tSamples[nSamplesCollected.get()] = SystemClock.uptimeMillis() / 1000.0;
                    axSamples[nSamplesCollected.get()] = lastAccelValues[0];
                    aySamples[nSamplesCollected.get()] = lastAccelValues[1];
                    azSamples[nSamplesCollected.get()] = lastAccelValues[2];
                    gxSamples[nSamplesCollected.get()] = lastGyroValues[0];
                    gySamples[nSamplesCollected.get()] = lastGyroValues[1];
                    gzSamples[nSamplesCollected.get()] = lastGyroValues[2];
                    luxSamples[nSamplesCollected.get()] = lastLuxValue;

                    nSamplesCollected.incrementAndGet();
                }
            }

            @Override
            public void onAccuracyChanged(Sensor sensor, int i) {

            }
        };

        sensorManager.registerListener(sensorListener, accelerometer, SensorManager.SENSOR_DELAY_FASTEST);
        sensorManager.registerListener(sensorListener, gyroscope, SensorManager.SENSOR_DELAY_FASTEST);
        sensorManager.registerListener(sensorListener, lightSensor, SensorManager.SENSOR_DELAY_FASTEST);

        // Make sure the service remains active when the screen is off.
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "indiepocket:wakelock");
        wakeLock.acquire(30*60*1000L /*30 minutes*/);

        // Start classifying continuously.
        classifyContinuously();

        //
        return START_STICKY;
    }

    public void onDestroy() {
        if(classifyThread != null)
            classifyThread.interrupt();
        tts.shutdown();
        sensorManager.unregisterListener(sensorListener);
        wakeLock.release();
        running = false;
    }

    private void classifyContinuously()
    {
        classifyThread = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    while(running) {
                        // Start recording.
                        nSamplesCollected.set(0);

                        while (nSamplesCollected.get() < SAMPLES_SET_SIZE)
                            Thread.sleep(100);

                        // Classify.
                        String conditionStr = classify(axSamples, aySamples, azSamples);

                        tts.speak("Current location: " + conditionStr, TextToSpeech.QUEUE_ADD, null, "");
                    }

                } catch (InterruptedException e) {
                    //
                }
            }
        });
        classifyThread.start();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static boolean isRunning() {
        return running;
    }

    /**
     * A native method that is implemented by the 'native-lib' native library,
     * which is packaged with this application.
     */
    public native void setTrainingData(String calibFileContent);
    public native String classify(double[] ax, double[] ay, double[] az);

}
