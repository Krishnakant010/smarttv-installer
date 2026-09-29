package io.github.smarttvinstaller

import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButtonToggleGroup
import com.google.android.material.textfield.TextInputLayout
import io.github.smarttvinstaller.models.Preset
import io.github.smarttvinstaller.models.PresetCatalog
import io.github.smarttvinstaller.services.GitHubService
import io.github.smarttvinstaller.services.LgWebOsService
import io.github.smarttvinstaller.services.SamsungTizenService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    private lateinit var togglePlatform: MaterialButtonToggleGroup
    private lateinit var layoutPassphrase: TextInputLayout
    private lateinit var etIpAddress: EditText
    private lateinit var etPort: EditText
    private lateinit var etPassphrase: EditText
    private lateinit var actvPresets: AutoCompleteTextView
    private lateinit var etCustomRepo: EditText
    private lateinit var etAppId: EditText
    private lateinit var btnInstall: Button
    private lateinit var btnLaunch: Button
    private lateinit var btnUninstall: Button
    private lateinit var btnClearLogs: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var scrollLogs: ScrollView
    private lateinit var tvLogs: TextView

    private val githubService = GitHubService()
    private val lgService = LgWebOsService()
    private val tizenService = SamsungTizenService()

    private var activePresets: List<Preset> = emptyList()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupPlatformSelector()
        updatePlatformUi(false)

        btnInstall.setOnClickListener { handleInstall() }
        btnLaunch.setOnClickListener { handleLaunch() }
        btnUninstall.setOnClickListener { handleUninstall() }
        btnClearLogs.setOnClickListener { tvLogs.text = "" }
    }

    private fun initViews() {
        togglePlatform = findViewById(R.id.togglePlatform)
        layoutPassphrase = findViewById(R.id.layoutPassphrase)
        etIpAddress = findViewById(R.id.etIpAddress)
        etPort = findViewById(R.id.etPort)
        etPassphrase = findViewById(R.id.etPassphrase)
        actvPresets = findViewById(R.id.actvPresets)
        etCustomRepo = findViewById(R.id.etCustomRepo)
        etAppId = findViewById(R.id.etAppId)
        btnInstall = findViewById(R.id.btnInstall)
        btnLaunch = findViewById(R.id.btnLaunch)
        btnUninstall = findViewById(R.id.btnUninstall)
        btnClearLogs = findViewById(R.id.btnClearLogs)
        progressBar = findViewById(R.id.progressBar)
        scrollLogs = findViewById(R.id.scrollLogs)
        tvLogs = findViewById(R.id.tvLogs)
    }

    private fun setupPlatformSelector() {
        togglePlatform.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (isChecked) {
                val isTizen = checkedId == R.id.btnTizen
                updatePlatformUi(isTizen)
            }
        }
    }

    private fun updatePlatformUi(isTizen: Boolean) {
        if (isTizen) {
            etPort.setText("26101")
            layoutPassphrase.visibility = View.GONE
        } else {
            etPort.setText("9922")
            layoutPassphrase.visibility = View.VISIBLE
        }

        activePresets = PresetCatalog.presets.filter { it.isSamsung == isTizen }
        val adapter = ArrayAdapter(
            this,
            android.R.layout.simple_dropdown_item_1line,
            activePresets.map { it.name }
        )
        actvPresets.setAdapter(adapter)

        if (activePresets.isNotEmpty()) {
            val initial = activePresets[0]
            actvPresets.setText(initial.name, false)
            etCustomRepo.setText(initial.repo)
            etAppId.setText(if (initial.appId.isNotEmpty()) initial.appId else initial.pkgId)
        }

        actvPresets.setOnItemClickListener { _, _, position, _ ->
            val selected = activePresets[position]
            etCustomRepo.setText(selected.repo)
            etAppId.setText(if (selected.appId.isNotEmpty()) selected.appId else selected.pkgId)
        }
    }

    private fun setBusy(busy: Boolean) {
        progressBar.visibility = if (busy) View.VISIBLE else View.GONE
        btnInstall.isEnabled = !busy
        btnLaunch.isEnabled = !busy
        btnUninstall.isEnabled = !busy
    }

    private fun log(message: String) {
        val timestamp = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
        val formatted = "[$timestamp] $message\n"
        lifecycleScope.launch(Dispatchers.Main) {
            tvLogs.append(formatted)
            scrollLogs.post { scrollLogs.fullScroll(View.FOCUS_DOWN) }
        }
    }

    private fun isTargetTizen(): Boolean {
        return togglePlatform.checkedButtonId == R.id.btnTizen
    }

    private fun handleInstall() {
        val ip = etIpAddress.text.toString().trim()
        val portStr = etPort.text.toString().trim()
        val passphrase = etPassphrase.text.toString().trim()
        val repo = etCustomRepo.text.toString().trim()
        val isTizen = isTargetTizen()

        if (ip.isEmpty()) {
            log("Error: Please enter TV IP address.")
            return
        }
        val port = portStr.toIntOrNull() ?: if (isTizen) 26101 else 9922
        if (repo.isEmpty()) {
            log("Error: Please select a preset or specify a GitHub repo.")
            return
        }

        setBusy(true)
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val extension = if (isTizen) ".wgt" else ".ipk"
                log("Resolving release asset for $repo ($extension)...")
                val (assetName, downloadUrl) = githubService.fetchLatestAsset(repo, extension)
                log("Found asset: $assetName")

                val localFile = File(cacheDir, assetName)
                githubService.downloadAsset(downloadUrl, localFile) { progress ->
                    log(progress)
                }

                if (isTizen) {
                    tizenService.installPackage(ip, port, localFile) { log(it) }
                } else {
                    lgService.installPackage(ip, port, passphrase, localFile) { log(it) }
                }
            } catch (e: Exception) {
                log("Error: ${e.message ?: e.toString()}")
            } finally {
                withContext(Dispatchers.Main) {
                    setBusy(false)
                }
            }
        }
    }

    private fun handleLaunch() {
        val ip = etIpAddress.text.toString().trim()
        val portStr = etPort.text.toString().trim()
        val passphrase = etPassphrase.text.toString().trim()
        val appId = etAppId.text.toString().trim()
        val isTizen = isTargetTizen()

        if (ip.isEmpty()) {
            log("Error: Please enter TV IP address.")
            return
        }
        if (appId.isEmpty()) {
            log("Error: Please enter Application ID.")
            return
        }
        val port = portStr.toIntOrNull() ?: if (isTizen) 26101 else 9922

        setBusy(true)
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                if (isTizen) {
                    tizenService.launchApp(ip, port, appId) { log(it) }
                } else {
                    lgService.launchApp(ip, port, passphrase, appId) { log(it) }
                }
            } catch (e: Exception) {
                log("Error: ${e.message ?: e.toString()}")
            } finally {
                withContext(Dispatchers.Main) {
                    setBusy(false)
                }
            }
        }
    }

    private fun handleUninstall() {
        val ip = etIpAddress.text.toString().trim()
        val portStr = etPort.text.toString().trim()
        val passphrase = etPassphrase.text.toString().trim()
        val appId = etAppId.text.toString().trim()
        val isTizen = isTargetTizen()

        if (ip.isEmpty()) {
            log("Error: Please enter TV IP address.")
            return
        }
        if (appId.isEmpty()) {
            log("Error: Please enter Application ID / Package ID.")
            return
        }
        val port = portStr.toIntOrNull() ?: if (isTizen) 26101 else 9922

        setBusy(true)
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                if (isTizen) {
                    tizenService.uninstallApp(ip, port, appId) { log(it) }
                } else {
                    lgService.uninstallApp(ip, port, passphrase, appId) { log(it) }
                }
            } catch (e: Exception) {
                log("Error: ${e.message ?: e.toString()}")
            } finally {
                withContext(Dispatchers.Main) {
                    setBusy(false)
                }
            }
        }
    }
}
