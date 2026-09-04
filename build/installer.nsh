!macro customCheckAppRunning
  ; The stock check can mistake a stale updater process for the application.
  ; Match only the real executable name, terminate its process tree, and continue.
  nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  Sleep 1500

  ; Versions up to 1.3.0 accidentally packaged Capacitor's Android build cache.
  ; Its nested paths exceed the old NSIS uninstaller's rename limit and make it
  ; report a misleading "application cannot be closed" error. Remove only that
  ; generated cache before the old uninstaller starts.
  nsExec::Exec `"$SYSDIR\cmd.exe" /C rmdir /S /Q "\\?\$INSTDIR\resources\app.asar.unpacked\node_modules\@capacitor"`
  Pop $0
!macroend
