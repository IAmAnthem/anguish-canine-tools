param(
    [Parameter(Mandatory)]
    [string]$Path,

    [string]$SheetName,

    [int]$PreviewRows = 12,

    [int]$PreviewColumns = 12
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ColumnIndex {
    param([Parameter(Mandatory)][string]$CellReference)

    $letters = ($CellReference -replace "[^A-Z]", "")
    $index = 0
    foreach ($char in $letters.ToCharArray()) {
        $index = ($index * 26) + ([int][char]$char - [int][char]'A' + 1)
    }
    return $index
}

function Get-CellText {
    param(
        [Parameter(Mandatory)]$Cell,
        [Parameter(Mandatory)]$SharedStrings
    )

    $type = $Cell.t
    $value = $Cell.v

    if ($type -eq "s") {
        if ($null -eq $value) { return "" }
        return $SharedStrings[[int]$value]
    }

    if ($type -eq "inlineStr") {
        return [string]$Cell.is.t
    }

    if ($null -eq $value) {
        return ""
    }

    return [string]$value
}

function Read-XmlEntry {
    param(
        [Parameter(Mandatory)]$Zip,
        [Parameter(Mandatory)][string]$EntryName
    )

    $entry = $Zip.GetEntry($EntryName)
    if ($null -eq $entry) {
        return $null
    }

    $stream = $entry.Open()
    try {
        $reader = New-Object System.IO.StreamReader($stream)
        try {
            [xml]$reader.ReadToEnd()
        } finally {
            $reader.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

$resolvedPath = Resolve-Path $Path
$zip = [System.IO.Compression.ZipFile]::OpenRead($resolvedPath)

try {
    $sharedStrings = @()
    $sharedStringsXml = Read-XmlEntry -Zip $zip -EntryName "xl/sharedStrings.xml"
    if ($sharedStringsXml) {
        foreach ($si in $sharedStringsXml.sst.si) {
            if ($si.t) {
                $sharedStrings += [string]$si.t
            } else {
                $text = ""
                foreach ($run in $si.r) {
                    $text += [string]$run.t
                }
                $sharedStrings += $text
            }
        }
    }

    $workbook = Read-XmlEntry -Zip $zip -EntryName "xl/workbook.xml"
    $relationships = Read-XmlEntry -Zip $zip -EntryName "xl/_rels/workbook.xml.rels"
    $relationshipTargets = @{}
    foreach ($rel in $relationships.Relationships.Relationship) {
        $relationshipTargets[$rel.Id] = $rel.Target
    }

    $summary = @()

    foreach ($sheet in $workbook.workbook.sheets.sheet) {
        if (-not [string]::IsNullOrWhiteSpace($SheetName) -and $sheet.name -ne $SheetName) {
            continue
        }

        $relationshipId = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
        $target = $relationshipTargets[$relationshipId]
        if ($target -notlike "xl/*") {
            $target = "xl/$target"
        }

        $sheetXml = Read-XmlEntry -Zip $zip -EntryName $target
        $dimension = if ($sheetXml.worksheet.dimension) { $sheetXml.worksheet.dimension.ref } else { "" }
        $rows = @($sheetXml.worksheet.sheetData.row)

        $preview = @()
        foreach ($row in ($rows | Select-Object -First $PreviewRows)) {
            $values = New-Object string[] $PreviewColumns
            foreach ($cell in $row.c) {
                $column = Get-ColumnIndex $cell.r
                if ($column -ge 1 -and $column -le $PreviewColumns) {
                    $values[$column - 1] = Get-CellText -Cell $cell -SharedStrings $sharedStrings
                }
            }
            $preview += ,$values
        }

        $summary += [ordered]@{
            name = [string]$sheet.name
            dimension = [string]$dimension
            rowCount = $rows.Count
            preview = $preview
        }
    }

    $summary | ConvertTo-Json -Depth 10
} finally {
    $zip.Dispose()
}
