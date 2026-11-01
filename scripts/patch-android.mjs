// Adds the permissions the app needs to the generated Android project.
import fs from 'node:fs';
const p = 'android/app/src/main/AndroidManifest.xml';
let x = fs.readFileSync(p, 'utf8');
const perms = ['android.permission.INTERNET','android.permission.RECORD_AUDIO','android.permission.MODIFY_AUDIO_SETTINGS','android.permission.POST_NOTIFICATIONS','android.permission.SCHEDULE_EXACT_ALARM','android.permission.USE_EXACT_ALARM','android.permission.RECEIVE_BOOT_COMPLETED','android.permission.VIBRATE'];
for (const perm of perms) if (!x.includes(perm)) x = x.replace('</manifest>', `    <uses-permission android:name="${perm}" />\n</manifest>`);
if (!x.includes('android.speech.RecognitionService')) x = x.replace('</manifest>', `    <queries><intent><action android:name="android.speech.RecognitionService" /></intent></queries>\n</manifest>`);
if (!x.includes('android:allowBackup="false"')) x = x.replace('android:allowBackup="true"', 'android:allowBackup="false"');
fs.writeFileSync(p, x);
// RTL + Arabic app label already come from capacitor.config.json (appName)
console.log('AndroidManifest patched');
