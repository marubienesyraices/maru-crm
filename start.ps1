# start.ps1
# Script para iniciar el CRM Maru Bienes y Raíces (API + Frontend) en Windows

Write-Host "Iniciando Maru CRM..." -ForegroundColor Cyan

# Directorio base
$baseDir = $PSScriptRoot

# Verificar si node_modules existe, si no, instalar dependencias
if (-Not (Test-Path "$baseDir\node_modules")) {
    Write-Host "Instalando dependencias base..." -ForegroundColor Yellow
    npm install
}

# 1. Iniciar la API de NestJS en una nueva ventana
Write-Host "Iniciando Backend (API) en el puerto 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'API - GestProp CRM'; cd '$baseDir'; npm run dev -w api"

# Esperar unos segundos para que la API empiece a levantar
Start-Sleep -Seconds 5

# 2. Iniciar el Frontend de Vite (React) en otra ventana
Write-Host "Iniciando Frontend (Web) en el puerto 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Web - GestProp CRM'; cd '$baseDir'; npm run dev -w web"

# Esperar unos segundo
Start-Sleep -Seconds 5

# 3. Iniciar el Portal Público (Next.js) en otra ventana
Write-Host "Iniciando Portal (Next.js) en el puerto 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.UI.RawUI.WindowTitle = 'Portal - GestProp CRM'; cd '$baseDir'; npm run dev -w portal"

Write-Host ""
Write-Host "¡Servicios iniciados en ventanas separadas!" -ForegroundColor Cyan
Write-Host "API: http://localhost:3000/api"
Write-Host "Web: http://localhost:5173"
Write-Host "Portal: http://localhost:3001"
Write-Host ""
Write-Host "Para detenerlos, simplemente cierra las nuevas ventanas de PowerShell." -ForegroundColor Yellow
