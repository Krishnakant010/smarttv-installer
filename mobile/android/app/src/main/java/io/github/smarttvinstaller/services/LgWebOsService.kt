package io.github.smarttvinstaller.services

import com.jcraft.jsch.ChannelExec
import com.jcraft.jsch.ChannelSftp
import com.jcraft.jsch.JSch
import com.jcraft.jsch.Session
import java.io.BufferedReader
import java.io.File
import java.io.FileInputStream
import java.io.InputStreamReader
import java.util.Properties

class LgWebOsService {

    private fun createSession(ip: String, port: Int, passphrase: String): Session {
        val jsch = JSch()
        val session = jsch.getSession("prisoner", ip, port)
        if (passphrase.isNotBlank()) {
            session.setPassword(passphrase)
        }
        val config = Properties()
        config["StrictHostKeyChecking"] = "no"
        config["PreferredAuthentications"] = "password,keyboard-interactive,publickey"
        session.setConfig(config)
        session.timeout = 15000
        session.connect()
        return session
    }

    fun installPackage(ip: String, port: Int, passphrase: String, ipkFile: File, onLog: (String) -> Unit) {
        onLog("Connecting to LG webOS TV at $ip:$port (user: prisoner)...")
        var session: Session? = null
        try {
            session = createSession(ip, port, passphrase)
            onLog("SSH connection established. Uploading ${ipkFile.name}...")

            val sftpChannel = session.openChannel("sftp") as ChannelSftp
            sftpChannel.connect(10000)

            val remotePath = "/tmp/package.ipk"
            FileInputStream(ipkFile).use { input ->
                sftpChannel.put(input, remotePath, ChannelSftp.OVERWRITE)
            }
            sftpChannel.disconnect()
            onLog("Package uploaded to $remotePath. Invoking webOS appInstallService...")

            val cmd = "luna-send-pub -i -n 1 'luna://com.webos.appInstallService/install' '{\"id\":\"installer\",\"ipkUrl\":\"$remotePath\"}'"
            val output = executeCommand(session, cmd)
            onLog("Response: $output")

            if (output.contains("\"returnValue\":true") || output.contains("SUCCESS") || output.contains("installed")) {
                onLog("Installation successful on LG webOS TV!")
            } else if (output.contains("\"returnValue\":false")) {
                throw Exception("webOS appInstallService returned failure: $output")
            } else {
                onLog("Command finished: $output")
            }
        } catch (e: Exception) {
            val msg = e.message ?: e.toString()
            if (msg.contains("Auth fail", ignoreCase = true) || msg.contains("authentication", ignoreCase = true)) {
                throw Exception("LG authentication failed. Ensure Developer Mode app is active on TV and enter the exact passphrase displayed.")
            }
            throw e
        } finally {
            session?.disconnect()
        }
    }

    fun launchApp(ip: String, port: Int, passphrase: String, appId: String, onLog: (String) -> Unit) {
        if (appId.isBlank()) throw Exception("No Application ID specified to launch")
        onLog("Connecting to LG webOS TV at $ip:$port to launch $appId...")
        var session: Session? = null
        try {
            session = createSession(ip, port, passphrase)
            val cmd = "luna-send-pub -i -n 1 'luna://com.webos.applicationManager/launch' '{\"id\":\"$appId\"}'"
            val output = executeCommand(session, cmd)
            onLog("Launch response: $output")
        } finally {
            session?.disconnect()
        }
    }

    fun uninstallApp(ip: String, port: Int, passphrase: String, appId: String, onLog: (String) -> Unit) {
        if (appId.isBlank()) throw Exception("No Application ID specified to uninstall")
        onLog("Connecting to LG webOS TV at $ip:$port to uninstall $appId...")
        var session: Session? = null
        try {
            session = createSession(ip, port, passphrase)
            val cmd = "luna-send-pub -i -n 1 'luna://com.webos.appInstallService/remove' '{\"id\":\"$appId\"}'"
            val output = executeCommand(session, cmd)
            onLog("Uninstall response: $output")
        } finally {
            session?.disconnect()
        }
    }

    private fun executeCommand(session: Session, command: String): String {
        val execChannel = session.openChannel("exec") as ChannelExec
        execChannel.setCommand(command)
        execChannel.inputStream = null
        val stdout = execChannel.inputStream
        val stderr = execChannel.errStream

        execChannel.connect(10000)

        val reader = BufferedReader(InputStreamReader(stdout))
        val errReader = BufferedReader(InputStreamReader(stderr))
        val sb = StringBuilder()

        var line: String?
        while (reader.readLine().also { line = it } != null) {
            sb.append(line).append("\n")
        }
        while (errReader.readLine().also { line = it } != null) {
            sb.append(line).append("\n")
        }

        execChannel.disconnect()
        return sb.toString().trim()
    }
}
