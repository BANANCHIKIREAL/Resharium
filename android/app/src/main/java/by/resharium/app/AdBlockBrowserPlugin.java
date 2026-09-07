package by.resharium.app;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AdBlockBrowser")
public class AdBlockBrowserPlugin extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("Не указана ссылка");
            return;
        }
        Uri parsed = Uri.parse(url);
        String scheme = parsed.getScheme();
        if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
            call.reject("Разрешены только http:// и https:// ссылки");
            return;
        }
        getActivity().runOnUiThread(() -> {
            Intent intent = new Intent(getContext(), AdBlockBrowserActivity.class);
            intent.putExtra(AdBlockBrowserActivity.EXTRA_URL, url);
            intent.putExtra(AdBlockBrowserActivity.EXTRA_ADBLOCK, call.getBoolean("adBlockEnabled", true));
            getActivity().startActivity(intent);
            call.resolve(new JSObject());
        });
    }
}
