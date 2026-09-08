package by.resharium.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdBlockBrowserPlugin.class);
        registerPlugin(QuickSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
