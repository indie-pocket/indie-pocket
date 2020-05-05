package ch.epfl.indiepocket.classifier;

import android.content.Intent;
import android.media.AudioManager;
import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    public static final String TAG = "indie-pocket";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        if(AnalysisService.isRunning()) {
            findViewById(R.id.start_button).setEnabled(false);
            findViewById(R.id.stop_button).setEnabled(true);
        }
        else {
            findViewById(R.id.start_button).setEnabled(true);
            findViewById(R.id.stop_button).setEnabled(false);
        }

        // The volume keys should affect the multimedia volume, not the ringtone.
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }

    public void startLoggingService(View v) {
        Intent i = new Intent(this, AnalysisService.class);
        startService(i);
        findViewById(R.id.start_button).setEnabled(false);
        findViewById(R.id.stop_button).setEnabled(true);
    }

    public void stopLoggingService(View v) {
        Intent i = new Intent(this, AnalysisService.class);
        stopService(i);
        findViewById(R.id.start_button).setEnabled(true);
        findViewById(R.id.stop_button).setEnabled(false);
    }
}
