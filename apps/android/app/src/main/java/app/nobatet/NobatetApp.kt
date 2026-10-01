package app.nobatet

import android.app.Application
import app.nobatet.data.AppContainer

class NobatetApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
