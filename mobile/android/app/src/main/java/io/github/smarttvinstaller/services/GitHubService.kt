package io.github.smarttvinstaller.services

import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

class GitHubService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    fun fetchLatestAsset(repo: String, extension: String): Pair<String, String> {
        val cleanRepo = repo.trim().removePrefix("https://github.com/").removeSuffix("/")
        val url = "https://api.github.com/repos/$cleanRepo/releases/latest"
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "SmartTV-Installer-Android")
            .header("Accept", "application/vnd.github.v3+json")
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("GitHub API failed with HTTP ${response.code}: ${response.message}")
            }
            val body = response.body?.string() ?: throw Exception("Empty response from GitHub API")
            val json = JSONObject(body)
            val assets = json.optJSONArray("assets") ?: throw Exception("No assets found in release")

            for (i in 0 until assets.length()) {
                val asset = assets.getJSONObject(i)
                val name = asset.getString("name")
                if (name.endsWith(extension, ignoreCase = true)) {
                    val downloadUrl = asset.getString("browser_download_url")
                    return Pair(name, downloadUrl)
                }
            }
            throw Exception("No $extension package asset found in latest release of $cleanRepo")
        }
    }

    fun downloadAsset(url: String, destFile: File, onProgress: (String) -> Unit): File {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "SmartTV-Installer-Android")
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Download failed with HTTP ${response.code}: ${response.message}")
            }
            val body = response.body ?: throw Exception("Response body was null")
            val totalBytes = body.contentLength()

            destFile.parentFile?.mkdirs()
            var downloaded = 0L

            body.byteStream().use { input ->
                FileOutputStream(destFile).use { output ->
                    val buffer = ByteArray(8192)
                    var read: Int
                    var lastReport = System.currentTimeMillis()

                    while (input.read(buffer).also { read = it } != -1) {
                        output.write(buffer, 0, read)
                        downloaded += read
                        val now = System.currentTimeMillis()
                        if (now - lastReport > 500) {
                            lastReport = now
                            val mb = downloaded / (1024 * 1024.0)
                            if (totalBytes > 0) {
                                val totalMb = totalBytes / (1024 * 1024.0)
                                val pct = (downloaded * 100 / totalBytes).toInt()
                                onProgress(String.format("Downloading: %.1f / %.1f MB (%d%%)", mb, totalMb, pct))
                            } else {
                                onProgress(String.format("Downloading: %.1f MB", mb))
                            }
                        }
                    }
                }
            }
        }
        return destFile
    }
}
