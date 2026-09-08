package by.resharium.app;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import java.io.ByteArrayInputStream;

public class AdBlockBrowserActivity extends AppCompatActivity {
    public static final String EXTRA_URL = "url";
    public static final String EXTRA_ADBLOCK = "adBlockEnabled";
    private static final String HIDE_ADS_SCRIPT = "(function(){var s=document.getElementById('resharium-adblock');if(!s){s=document.createElement('style');s.id='resharium-adblock';s.textContent='.adsbygoogle,[id^=\\\"yandex_rtb\\\"],.adfox,[data-ad],iframe[src*=\\\"doubleclick\\\"],iframe[src*=\\\"googlesyndication\\\"]{display:none!important;visibility:hidden!important;max-height:0!important}';document.documentElement.appendChild(s)}})()";
    private WebView webView;
    private TextView address;
    private int blockedCount = 0;
    private TextView adBlockBadge;
    private boolean adBlockEnabled;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(8, 9, 16));
        getWindow().setNavigationBarColor(Color.rgb(8, 9, 16));
        adBlockEnabled = getIntent().getBooleanExtra(EXTRA_ADBLOCK, true);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(8, 9, 16));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(6), dp(6), dp(6), dp(6));
        toolbar.setBackgroundColor(Color.rgb(16, 17, 24));
        root.addView(toolbar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)));

        toolbar.addView(toolbarButton("‹", view -> goBack()));
        toolbar.addView(toolbarButton("›", view -> { if (webView.canGoForward()) webView.goForward(); }));
        toolbar.addView(toolbarButton("↻", view -> webView.reload()));

        address = new TextView(this);
        address.setSingleLine(true);
        address.setEllipsize(android.text.TextUtils.TruncateAt.MIDDLE);
        address.setTextColor(Color.rgb(160, 162, 174));
        address.setTextSize(12);
        address.setMinWidth(0);
        address.setPadding(dp(12), 0, dp(12), 0);
        address.setBackgroundColor(Color.rgb(11, 12, 17));
        LinearLayout.LayoutParams addressParams = new LinearLayout.LayoutParams(0, dp(42), 1f);
        addressParams.setMargins(dp(4), 0, dp(6), 0);
        toolbar.addView(address, addressParams);

        adBlockBadge = new TextView(this);
        adBlockBadge.setText(adBlockEnabled ? "✓ 0" : "Off");
        adBlockBadge.setGravity(Gravity.CENTER);
        adBlockBadge.setTextColor(Color.rgb(111, 218, 171));
        adBlockBadge.setTextSize(11);
        adBlockBadge.setPadding(dp(8), 0, dp(8), 0);
        toolbar.addView(adBlockBadge, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dp(42)));
        toolbar.addView(toolbarButton("×", view -> finish()));

        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String scheme = request.getUrl().getScheme();
                return !"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (adBlockEnabled && !request.isForMainFrame() && AdBlockRules.isBlocked(request.getUrl().toString())) {
                    runOnUiThread(() -> {
                        blockedCount += 1;
                        adBlockBadge.setText("✓ " + blockedCount);
                    });
                    return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                address.setText(url);
                if (adBlockEnabled) view.evaluateJavascript(HIDE_ADS_SCRIPT, null);
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { goBack(); }
        });

        String url = getIntent().getStringExtra(EXTRA_URL);
        if (url == null) { finish(); return; }
        address.setText(url);
        webView.loadUrl(url);
    }

    private TextView toolbarButton(String text, View.OnClickListener listener) {
        TextView button = new TextView(this);
        button.setText(text);
        button.setTextColor(Color.rgb(205, 205, 215));
        button.setTextSize(25);
        button.setGravity(Gravity.CENTER);
        button.setOnClickListener(listener);
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setContentDescription(text.equals("×") ? "Закрыть" : text);
        button.setLayoutParams(new LinearLayout.LayoutParams(dp(38), dp(42)));
        return button;
    }

    private void goBack() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else finish();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
