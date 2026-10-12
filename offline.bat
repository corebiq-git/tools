setlocal
cd /d %~dp0
set versionNumber=0
set regquery=%SystemRoot%\System32\reg.exe query "HKLM\Software\Microsoft\Internet Explorer" /v svcVersion
for /f "tokens=3" %%a in ('%regquery%') do (
  for /f "tokens=1 delims=." %%b in ("%%a") do (
    if %%b GEQ 10 (
       set versionNumber=%%b
    )
  )
)
if %versionNumber% LSS 10 (
  set regquery=%SystemRoot%\System32\reg.exe query "HKLM\Software\Microsoft\Internet Explorer" /v Version 
  for /f "tokens=3" %%a in ('%regquery%') do (
    for /f "tokens=1 delims=." %%b in ("%%a") do (
      set versionNumber=%%b
    )
  )    
)
if %versionNumber% LSS 10  (
  echo You are running less than IE 10;
  start "" http://localhost:3010
		
)
if %versionNumber% GEQ 10 (
  echo You are running Internet explorer 10 or higher.
   start msie-app.hta
       
)