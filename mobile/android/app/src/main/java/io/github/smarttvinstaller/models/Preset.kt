package io.github.smarttvinstaller.models

data class Preset(
    val name: String,
    val repo: String,
    val isSamsung: Boolean,
    val appId: String,
    val pkgId: String,
    val description: String
)

object PresetCatalog {
    val presets = listOf(
        Preset("webOS Homebrew Channel", "webosbrew/webos-homebrew-channel", false, "org.webosbrew.hbchannel", "", "Homebrew App Store for webOS"),
        Preset("YouTube for webOS", "webosbrew/youtube-webos", false, "youtube.leanback.v4", "", "Ad-free YouTube client for LG TVs"),
        Preset("Moonlight TV (LG)", "mariotaku/moonlight-tv", false, "com.limelight.webos", "", "NVIDIA GameStream & Sunshine client"),
        Preset("Nuvio Native Legacy (LG)", "Krishnakant010/nuvio-webos-app", false, "com.nuvio.app", "", "High-performance native media client"),
        Preset("Custom webOS Repo (.ipk)", "", false, "", "", "Custom GitHub repository with .ipk release"),
        Preset("TizenBrew", "reisxd/TizenBrew", true, "k096ggh1s9.TizenBrew", "k096ggh1s9", "Homebrew loader for Samsung Smart TVs"),
        Preset("Moonlight TV (Tizen)", "mariotaku/moonlight-tv", true, "3201907018807", "MoonlightTizen", "GameStream client for Samsung TVs"),
        Preset("NuvioX Watch Party (Tizen)", "Krishnakant010/nuvio-smarttv-installer", true, "org.tizen.nuviox", "org.tizen.nuviox", "Synchronized watch party player"),
        Preset("Nuvio Native Legacy (Tizen)", "Krishnakant010/nuvio-tizen-app", true, "org.tizen.nuvio", "org.tizen.nuvio", "Optimized media player for Tizen OS"),
        Preset("Custom Tizen Repo (.wgt)", "", true, "", "", "Custom GitHub repository with .wgt release")
    )
}
