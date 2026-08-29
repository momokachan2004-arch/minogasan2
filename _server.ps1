$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = 'http://localhost:8777/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Host ''
Write-Host '  見逃さん ローカルサーバー'
Write-Host ('  ' + $prefix + 'index.html をブラウザで開いてください')
Write-Host '  終了するには、このウィンドウを閉じてください'
Write-Host ''
try { Start-Process ($prefix + 'index.html') } catch {}
$mime = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.webmanifest' = 'application/manifest+json; charset=utf-8'; '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon' }
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
    $path = Join-Path $root $rel
    if ((Test-Path $path -PathType Leaf) -and $path.StartsWith($root)) {
      $bytes = [System.IO.File]::ReadAllBytes($path)
      $ext = [System.IO.Path]::GetExtension($path).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.OutputStream.Close()
  } catch { Write-Host ('err: ' + $_) }
}
