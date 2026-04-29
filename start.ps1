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
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir'; title API - Maru CRM; npm run dev -w api"

# Esperar unos segundos para que la API empiece a levantar
Start-Sleep -Seconds 3

# 2. Iniciar el Frontend de Vite (React) en otra ventana
Write-Host "Iniciando Frontend (Web) en el puerto 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir'; title Web - Maru CRM; npm run dev -w web"

Write-Host ""
Write-Host "¡Servicios iniciados en ventanas separadas!" -ForegroundColor Cyan
Write-Host "API: http://localhost:3000/api"
Write-Host "Web: http://localhost:5173"
Write-Host ""
Write-Host "Para detenerlos, simplemente cierra las nuevas ventanas de PowerShell." -ForegroundColor Yellow
