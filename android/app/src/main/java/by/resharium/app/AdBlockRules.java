package by.resharium.app;

import android.net.Uri;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

final class AdBlockRules {
    private static final Set<String> BLOCKED_HOSTS = new HashSet<>(Arrays.asList(
        "2mdn.net", "adfox.ru", "adnxs.com", "adsrvr.org", "bidswitch.net",
        "clarity.ms", "criteo.com", "criteo.net", "doubleclick.net", "facebook.net",
        "google-analytics.com", "googleadservices.com", "googlesyndication.com",
        "hotjar.com", "mytarget.ru", "openx.net", "outbrain.com", "pubmatic.com",
        "rubiconproject.com", "scorecardresearch.com", "smartadserver.com",
        "taboola.com", "tns-counter.ru", "yandexadexchange.net"
    ));

    private static final Set<String> BLOCKED_EXACT_HOSTS = new HashSet<>(Arrays.asList(
        "ad.mail.ru", "ads.adfox.ru", "an.yandex.ru", "counter.yadro.ru",
        "mc.yandex.ru", "pagead2.googlesyndication.com", "securepubads.g.doubleclick.net"
    ));

    private AdBlockRules() {}

    static boolean isBlocked(String url) {
        try {
            String host = Uri.parse(url).getHost();
            if (host == null) return false;
            host = host.toLowerCase(Locale.ROOT);
            if (host.startsWith("www.")) host = host.substring(4);
            if (BLOCKED_EXACT_HOSTS.contains(host)) return true;
            for (String domain : BLOCKED_HOSTS) {
                if (host.equals(domain) || host.endsWith("." + domain)) return true;
            }
        } catch (Exception ignored) {}
        return false;
    }
}
