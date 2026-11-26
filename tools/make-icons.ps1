# Draws the PNG app icons and the social preview image from the same shapes
# as assets/icon.svg (Windows PowerShell, System.Drawing; no other tools).
# Run from the repository root:  powershell -File tools/make-icons.ps1
# The PNGs are committed; run this again only when the icon changes.

Add-Type -AssemblyName System.Drawing

$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets'
$green = [System.Drawing.ColorTranslator]::FromHtml('#1f3b2d')
$deep = [System.Drawing.ColorTranslator]::FromHtml('#16291f')
$orange = [System.Drawing.ColorTranslator]::FromHtml('#e08a3c')
$cream = [System.Drawing.ColorTranslator]::FromHtml('#f6f5f2')
$soft = [System.Drawing.ColorTranslator]::FromHtml('#b9c9bf')

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
  return @{ Bmp = $bmp; G = $g }
}

function Get-RoundedRect([single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# A trace with a via at each end. Points are in the 64-unit grid of icon.svg.
function Add-Trace($g, [single]$x, [single]$y, [single]$scale, $points, $color, $hole, [single]$width = 6, [single]$via = 6) {
  $pts = foreach ($p in $points) { New-Object System.Drawing.PointF ($x + $p[0] * $scale), ($y + $p[1] * $scale) }
  $pen = New-Object System.Drawing.Pen $color, ($width * $scale)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawLines($pen, [System.Drawing.PointF[]]$pts)
  $pen.Dispose()
  $fill = New-Object System.Drawing.SolidBrush $color
  $inner = New-Object System.Drawing.SolidBrush $hole
  foreach ($p in @($pts[0], $pts[$pts.Count - 1])) {
    $r = $via * $scale
    $g.FillEllipse($fill, $p.X - $r, $p.Y - $r, 2 * $r, 2 * $r)
    $r = $via * $scale * 2.5 / 6
    $g.FillEllipse($inner, $p.X - $r, $p.Y - $r, 2 * $r, 2 * $r)
  }
  $fill.Dispose()
  $inner.Dispose()
}

$glyph = @(@(10, 44), @(24, 44), @(34, 20), @(54, 20))

# size: canvas in px; radius: corner radius as a fraction of the size (0 = square,
# full bleed); glyphScale: share of the canvas the 64-unit artwork takes.
function Save-Icon([string]$name, [int]$size, [single]$radius, [single]$glyphScale) {
  $c = New-Canvas $size $size
  $g = $c.G
  $g.Clear([System.Drawing.Color]::Transparent)
  $brush = New-Object System.Drawing.SolidBrush $green
  if ($radius -gt 0) {
    $path = Get-RoundedRect 0 0 $size $size ($size * $radius)
    $g.FillPath($brush, $path)
    $path.Dispose()
  } else {
    $g.FillRectangle($brush, 0, 0, $size, $size)
  }
  $brush.Dispose()
  $scale = $size * $glyphScale / 64
  $offset = ($size - 64 * $scale) / 2
  Add-Trace $g $offset $offset $scale $glyph $orange $green
  $g.Dispose()
  $c.Bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $c.Bmp.Dispose()
}

Save-Icon 'icon-192.png' 192 (14 / 64) 1
Save-Icon 'icon-512.png' 512 (14 / 64) 1
# Maskable: the platform crops to its own shape, so keep the art in the middle 80 %.
Save-Icon 'icon-maskable-512.png' 512 0 0.66
# iOS rounds the corners itself and shows transparency as black.
Save-Icon 'apple-touch-icon.png' 180 0 0.82

# ---- Social images ----
# assets/social.png (1200 x 630) is the Open Graph image of the site.
# .github/social-preview.png (1280 x 640) is for the repository card: upload it
# by hand under Settings > General > Social preview. GitHub asks for an 80 px
# border free of important content, so its text and icon stay inside it.
$white = New-Object System.Drawing.SolidBrush $cream
$muted = New-Object System.Drawing.SolidBrush $soft
$accent = New-Object System.Drawing.SolidBrush $orange
$tileBrush = New-Object System.Drawing.SolidBrush $deep
$title = New-Object System.Drawing.Font 'Segoe UI', 84, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$lead = New-Object System.Drawing.Font 'Segoe UI', 38, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$small = New-Object System.Drawing.Font 'Segoe UI Semibold', 28, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
# Non-ASCII characters by code, so the script does not depend on its encoding.
$dot = "  $([char]0xB7)  "
$turkish = "T$([char]0xFC)rk$([char]0xE7)e"
$topics = @('IPC-2152 trace width', 'impedance', 'stack-up', 'SI', 'RF', 'power') -join $dot
$facts = @('Runs in the browser, also offline', "$turkish / English", 'MIT') -join $dot

# layout: Tile = x, y, size of the icon tile; Title/Lead1/Lead2/Line1/Line2 = x, y
# of each text line (top-left of the string box); Routes = decorative traces.
function Save-Social([string]$path, [int]$w, [int]$h, $layout) {
  $c = New-Canvas $w $h
  $g = $c.G
  $g.Clear($green)
  # Decorative routing on the right, in a darker tone so the text stays in front.
  foreach ($r in $layout.Routes) { Add-Trace $g 0 0 1 $r $deep $green 14 15 }
  $t = $layout.Tile
  $tile = Get-RoundedRect $t[0] $t[1] $t[2] $t[2] ([math]::Round($t[2] * 14 / 64))
  $g.FillPath($tileBrush, $tile)
  $tile.Dispose()
  Add-Trace $g $t[0] $t[1] ($t[2] / 64) $glyph $orange $deep
  $g.DrawString('Umay PCB Toolkit', $title, $white, $layout.Title[0], $layout.Title[1])
  $g.DrawString('Open-source PCB and electronics calculators', $lead, $white, $layout.Lead1[0], $layout.Lead1[1])
  $g.DrawString('with lessons for hardware engineers', $lead, $white, $layout.Lead2[0], $layout.Lead2[1])
  $g.DrawString($topics, $small, $accent, $layout.Line1[0], $layout.Line1[1])
  $g.DrawString($facts, $small, $muted, $layout.Line2[0], $layout.Line2[1])
  $g.Dispose()
  $c.Bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $c.Bmp.Dispose()
}

Save-Social (Join-Path $out 'social.png') 1200 630 @{
  Tile = @(80, 84, 132)
  Title = @(72, 250); Lead1 = @(78, 362); Lead2 = @(78, 410); Line1 = @(80, 492); Line2 = @(80, 536)
  Routes = @(
    @(@(640, 70), @(840, 70), @(900, 130), @(1140, 130)),
    @(@(560, 150), @(760, 150), @(820, 210), @(1150, 210)),
    @(@(900, 290), @(1000, 290), @(1060, 350), @(1150, 350)),
    @(@(890, 400), @(980, 400), @(1030, 450), @(1150, 450)),
    @(@(960, 590), @(1060, 590), @(1100, 550), @(1150, 550))
  )
}

$card = Join-Path (Split-Path $PSScriptRoot -Parent) '.github\social-preview.png'
Save-Social $card 1280 640 @{
  Tile = @(82, 80, 112)
  Title = @(62, 204); Lead1 = @(74, 318); Lead2 = @(74, 366); Line1 = @(75, 456); Line2 = @(75, 502)
  Routes = @(
    @(@(700, 60), @(900, 60), @(960, 120), @(1220, 120)),
    @(@(600, 150), @(820, 150), @(880, 210), @(1230, 210)),
    @(@(960, 290), @(1060, 290), @(1120, 350), @(1230, 350)),
    @(@(950, 400), @(1040, 400), @(1090, 450), @(1230, 450)),
    @(@(1000, 590), @(1100, 590), @(1140, 550), @(1230, 550))
  )
}

Get-ChildItem $out -Filter *.png | ForEach-Object { '{0,-24} {1,8:N0} bytes' -f $_.Name, $_.Length }
Get-Item $card | ForEach-Object { '{0,-24} {1,8:N0} bytes' -f $_.Name, $_.Length }
