Unicode true
!include "MUI2.nsh"
!define APPNAME "Hunter System"
!define VERSION "1.0.0"
!define SRC "dist/win-unpacked"
Name "${APPNAME}"
OutFile "dist/Hunter-System-Setup-${VERSION}.exe"
InstallDir "$LOCALAPPDATA\Programs\Hunter System"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ICON "build/icon.ico"
!define MUI_UNICON "build/icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\Hunter System.exe"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APPNAME}"
VIAddVersionKey "FileDescription" "${APPNAME} installer"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "CompanyName" "Omar Hady"
VIAddVersionKey "LegalCopyright" "Omar Hady"
Section "Install"
  SetOutPath "$INSTDIR"
  File /r "${SRC}/*"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\Hunter System.lnk" "$INSTDIR\Hunter System.exe" "" "$INSTDIR\hunter.ico"
  CreateShortcut "$DESKTOP\Hunter System.lnk" "$INSTDIR\Hunter System.exe" "" "$INSTDIR\hunter.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem" "DisplayName" "${APPNAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem" "Publisher" "Omar Hady"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem" "DisplayIcon" "$INSTDIR\hunter.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem" "NoModify" 1
SectionEnd
Section "Uninstall"
  Delete "$SMPROGRAMS\Hunter System.lnk"
  Delete "$DESKTOP\Hunter System.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HunterSystem"
SectionEnd
