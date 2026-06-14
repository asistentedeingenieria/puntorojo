package com.puntorojosa.puntorojo;

import android.Manifest;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    // Permisos nativos que la PWA necesita dentro del WebView:
    //  - CAMERA -> asistencia facial (getUserMedia) y fotos de DPI (<input capture>)
    //  - ACCESS_FINE/COARSE_LOCATION -> geocerca GPS al marcar asistencia (navigator.geolocation)
    // Capacitor pide CAMARA solo, pero NUNCA pide ubicacion; ademas Samsung exige que
    // CAMERA este concedida en runtime o getUserMedia falla en silencio. Por eso los
    // solicitamos explicitamente al abrir la app.
    private static final String[] NEEDED_PERMISSIONS = {
        Manifest.permission.CAMERA,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    };

    private static final int REQ_PERMISSIONS = 1820;

    @Override
    public void onStart() {
        super.onStart();
        List<String> toRequest = new ArrayList<>();
        for (String perm : NEEDED_PERMISSIONS) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                toRequest.add(perm);
            }
        }
        if (!toRequest.isEmpty()) {
            ActivityCompat.requestPermissions(this, toRequest.toArray(new String[0]), REQ_PERMISSIONS);
        }
    }
}
