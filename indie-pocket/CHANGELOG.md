TODO
    - create separate upload screen to be used for feedback and db-upload

0.6.3
    - added sound library for easier update afterwards
    
0.6.2
    - fixed UI when uploading
    - update shows real dialog
    - hide record buttons if not used
    
0.6.1
    - re-arranged screens, made nicer tracking
    
0.6.0
    - added insomnia while recording (no sleep)
    - moved 'Collector' to its own component

0.5.3
    - smaller fonts for buttons on small screens
    - change confirm -> alert
    - fix missing alert on start screen
    - add any-action
    
0.5.2
    - added message for feedback
    - get number of total uploads from all users

0.5.1
    - ios-background: show message and add 30s to background running
    - release-mgmt: actually use staging and production versions
    - add 'cancel' button to upload

0.5.0
    - Cleaned up code
    - Fixed upload and added confirmation
    - Debugging includes time series of when the system could record values
    - Adding 'running', 'biking'

0.4.9
    - Add version of the update to the view

0.4.8
    - Final cleanup
        - ScrollView and not ScrollLayout
        - upload bar nicer
        - hide other elements while uploading
        - show dialog at the end of the upload

0.4.7
    - Add debug-screen by clicking on (c)

0.4.6
    - fix ios measurements

0.4.5
    - test for nativescript-app-sync
    -1 update on next resume

0.4.4
    - automatic update using nativescript-app-sync

0.4.3
    - correct row update in display
    - wss connection

0.4.2
    - better iOS icon
    - Have best speed by default

0.4.1
    - increasing phase when pausing
    - UI improvements
    - signed apps

0.4.0
    - adding iOS
    - updating UI
    - adding device string
    - changing icon
    
0.3.9
    - time:
        - uploaded
        - current
    - two buttons below:
        - record
        - pause (optional)
        - stop
    - rows recorded below
    
0.3.8
    - increase phase when flushing
    - use event timestamps
    - buffer at 32k

0.3.7
    - even less jitter
    - added "Crazy" speed

0.3.6
    - buffering data

0.3.5
    - Adding unique IDs
    - Adding version to DB

0.3.4
    - Faster UI - don't use [text]="method()" in Angular - it'll be called all the time...
