package io.github.smarttvinstaller.services

import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.zip.ZipFile
import javax.xml.parsers.DocumentBuilderFactory

class SamsungTizenService {

    private val CMD_CNXN = 0x4e584e43
    private val CMD_OPEN = 0x4e45504f
    private val CMD_OKAY = 0x59414b4f
    private val CMD_CLSE = 0x45534c43
    private val CMD_WRTE = 0x45545257

    data class SdbPacket(
        val command: Int,
        val arg0: Int,
        val arg1: Int,
        val data: ByteArray
    )

    data class TizenMetadata(
        val packageId: String,
        val appId: String
    )

    fun parseWgtMetadata(wgtFile: File): TizenMetadata {
        ZipFile(wgtFile).use { zip ->
            val entry = zip.getEntry("config.xml") ?: return TizenMetadata("", "")
            zip.getInputStream(entry).use { stream ->
                val factory = DocumentBuilderFactory.newInstance()
                val builder = factory.newDocumentBuilder()
                val doc = builder.parse(stream)
                val widget = doc.documentElement
                val pkgId = widget.getAttribute("id")
                val appNodes = widget.getElementsByTagName("tizen:application")
                var appId = ""
                if (appNodes.length > 0) {
                    val appElem = appNodes.item(0) as org.w3c.dom.Element
                    appId = appElem.getAttribute("id")
                }
                return TizenMetadata(pkgId, appId)
            }
        }
    }

    private fun writePacket(out: OutputStream, command: Int, arg0: Int, arg1: Int, data: ByteArray) {
        val header = ByteBuffer.allocate(24).order(ByteOrder.LITTLE_ENDIAN)
        header.putInt(command)
        header.putInt(arg0)
        header.putInt(arg1)
        header.putInt(data.size)
        var crc = 0
        for (b in data) {
            crc = (crc + (b.toInt() and 0xFF)) and 0xFFFFFFFF.toInt()
        }
        header.putInt(crc)
        header.putInt(command xor -0x1)

        out.write(header.array())
        if (data.isNotEmpty()) {
            out.write(data)
        }
        out.flush()
    }

    private fun readExact(input: InputStream, length: Int): ByteArray {
        val buffer = ByteArray(length)
        var totalRead = 0
        while (totalRead < length) {
            val count = input.read(buffer, totalRead, length - totalRead)
            if (count < 0) throw Exception("SDB socket closed prematurely")
            totalRead += count
        }
        return buffer
    }

    private fun readPacket(input: InputStream): SdbPacket {
        val headerBytes = readExact(input, 24)
        val buf = ByteBuffer.wrap(headerBytes).order(ByteOrder.LITTLE_ENDIAN)
        val command = buf.int
        val arg0 = buf.int
        val arg1 = buf.int
        val length = buf.int
        buf.int
        val magic = buf.int

        if (command != (magic xor -0x1)) {
            throw Exception("SDB magic check failed for command 0x" + Integer.toHexString(command))
        }

        val data = if (length > 0) readExact(input, length) else ByteArray(0)
        return SdbPacket(command, arg0, arg1, data)
    }

    private fun connectSdb(ip: String, port: Int): Pair<Socket, InputStream> {
        val socket = Socket()
        socket.connect(InetSocketAddress(ip, port), 10000)
        socket.soTimeout = 30000
        val out = socket.getOutputStream()
        val inStream = socket.getInputStream()

        val hostBanner = "host::\u0000".toByteArray(Charsets.US_ASCII)
        writePacket(out, CMD_CNXN, 0x01000001, 4096, hostBanner)

        val resp = readPacket(inStream)
        if (resp.command != CMD_CNXN) {
            socket.close()
            throw Exception("Samsung TV rejected SDB connection (expected CNXN, got 0x" + Integer.toHexString(resp.command) + ")")
        }
        return Pair(socket, inStream)
    }

    private fun executeShell(socket: Socket, inStream: InputStream, command: String, onLog: ((String) -> Unit)? = null): String {
        val out = socket.getOutputStream()
        val localId = 1
        val req = "shell:$command\u0000".toByteArray(Charsets.UTF_8)
        writePacket(out, CMD_OPEN, localId, 0, req)

        val openResp = readPacket(inStream)
        if (openResp.command != CMD_OKAY) {
            throw Exception("SDB failed to open shell channel")
        }
        val remoteId = openResp.arg0
        val sb = StringBuilder()

        while (true) {
            val pkt = readPacket(inStream)
            if (pkt.command == CMD_WRTE) {
                val text = String(pkt.data, Charsets.UTF_8)
                sb.append(text)
                onLog?.invoke(text.trim())
                writePacket(out, CMD_OKAY, localId, remoteId, ByteArray(0))
            } else if (pkt.command == CMD_CLSE) {
                writePacket(out, CMD_CLSE, localId, remoteId, ByteArray(0))
                break
            }
        }
        return sb.toString().trim()
    }

    fun installPackage(ip: String, port: Int, wgtFile: File, onLog: (String) -> Unit) {
        onLog("Connecting to Samsung Tizen TV at $ip:$port over SDB...")
        val (socket, inStream) = connectSdb(ip, port)
        try {
            onLog("Connected to Samsung TV SDB daemon.")
            val meta = try { parseWgtMetadata(wgtFile) } catch (e: Exception) { TizenMetadata("", "") }
            if (meta.appId.isNotBlank()) {
                onLog("Package metadata: ID=${meta.packageId}, AppId=${meta.appId}")
            }

            val remotePath = "/home/owner/share/tmp/sdk_tools/tmp/" + wgtFile.name
            onLog("Preparing remote directory: mkdir -p /home/owner/share/tmp/sdk_tools/tmp")
            executeShell(socket, inStream, "mkdir -p /home/owner/share/tmp/sdk_tools/tmp", onLog)

            onLog("Transferring ${wgtFile.name} (${wgtFile.length() / 1024} KB)...")
            val base64Content = android.util.Base64.encodeToString(wgtFile.readBytes(), android.util.Base64.NO_WRAP)
            val chunkSize = 32768
            var offset = 0
            val total = base64Content.length

            executeShell(socket, inStream, "rm -f $remotePath.b64 $remotePath", null)

            while (offset < total) {
                val end = minOf(offset + chunkSize, total)
                val chunk = base64Content.substring(offset, end)
                executeShell(socket, inStream, "printf '%s' '$chunk' >> $remotePath.b64", null)
                offset = end
                val pct = (offset * 100 / total)
                onLog("Uploading: $pct%")
            }

            executeShell(socket, inStream, "base64 -d $remotePath.b64 > $remotePath && rm -f $remotePath.b64", onLog)
            onLog("Upload verified. Executing tizen install...")

            val installOutput = executeShell(socket, inStream, "tizen install -n $remotePath", onLog)
            if (installOutput.contains("fail [-12]") || installOutput.contains("[-12]")) {
                throw Exception("Author certificate mismatch (-12). Developer Mode on Samsung TV requires a matching author certificate.")
            } else if (installOutput.contains("fail") || installOutput.contains("FATAL_ERROR")) {
                throw Exception("Samsung install failed: $installOutput")
            } else {
                onLog("Installation completed successfully on Samsung Tizen TV!")
            }
        } finally {
            socket.close()
        }
    }

    fun launchApp(ip: String, port: Int, appId: String, onLog: (String) -> Unit) {
        if (appId.isBlank()) throw Exception("No Application ID specified to launch")
        onLog("Connecting to Samsung Tizen TV at $ip:$port to launch $appId...")
        val (socket, inStream) = connectSdb(ip, port)
        try {
            val output = executeShell(socket, inStream, "app_launcher -s $appId", onLog)
            onLog("Launch output: $output")
        } finally {
            socket.close()
        }
    }

    fun uninstallApp(ip: String, port: Int, pkgId: String, onLog: (String) -> Unit) {
        if (pkgId.isBlank()) throw Exception("No Package ID specified to uninstall")
        onLog("Connecting to Samsung Tizen TV at $ip:$port to uninstall $pkgId...")
        val (socket, inStream) = connectSdb(ip, port)
        try {
            val output = executeShell(socket, inStream, "tizen uninstall -p $pkgId", onLog)
            onLog("Uninstall output: $output")
        } finally {
            socket.close()
        }
    }
}
