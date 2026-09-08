package by.resharium.app;

import android.app.StatusBarManager;
import android.content.ComponentName;
import android.graphics.drawable.Icon;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "QuickSettings")
public class QuickSettingsPlugin extends Plugin {
    @PluginMethod
    public void requestTile(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("supported", false);
            result.put("added", false);
            call.resolve(result);
            return;
        }

        StatusBarManager manager = getContext().getSystemService(StatusBarManager.class);
        if (manager == null) {
            call.reject("Панель быстрых настроек недоступна");
            return;
        }

        ComponentName component = new ComponentName(getContext(), ReshariumTileService.class);
        Icon icon = Icon.createWithResource(getContext(), R.drawable.ic_quick_settings_resharium);
        manager.requestAddTileService(component, getContext().getString(R.string.quick_settings_tile_label), icon,
            getContext().getMainExecutor(), status -> {
                JSObject result = new JSObject();
                result.put("supported", true);
                result.put("added", status == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED
                    || status == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ALREADY_ADDED);
                result.put("status", status);
                call.resolve(result);
            });
    }
}
