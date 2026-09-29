package io.github.smarttvinstaller

import android.app.Application
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader
import com.asterinet.react.tcpsocket.TcpSocketPackage
import com.rnfs.RNFSPackage

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : ReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            listOf(
                MainReactPackage(),
                TcpSocketPackage(),
                RNFSPackage()
            )

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = false
      }

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, false)
  }
}
