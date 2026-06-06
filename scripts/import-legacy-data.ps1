param(
    [string[]]$KnownsPaths = @(
        "..\CanineCalculations\KNOWNS.csv",
        "..\CanineCalculations\PRIVATE-KNOWNS.csv",
        "..\CanineCalculations\PRIVATE-KNOWNS-CURRENT.csv"
    ),
    [string[]]$BreedersPaths = @(
        "..\CanineBreeding\Breeders.csv",
        "..\CanineBreeding\PRIVATE-RETIRED-Breeders.csv",
        "..\CanineBreeding\PRIVATE-Breeders.csv"
    ),
    [string]$WorkbookPath = ".\private-data\Doli-Path.xlsx",
    [string]$OutputPath = ".\data\canonical"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem

$traits = @(
    "Alertness", "Appetite", "Brutality", "Development", "Eluding", "Energy",
    "Evasion", "Ferocity", "Fortitude", "Insight", "Might", "Nimbleness",
    "Patience", "Procreation", "Sufficiency", "Targeting", "Toughness"
)

function ConvertTo-CanonicalIdPart {
    param([Parameter(Mandatory)][string]$Value)

    $slug = $Value.Trim().ToLowerInvariant()
    $slug = $slug -replace "[^a-z0-9]+", "-"
    $slug = $slug.Trim("-")

    if ([string]::IsNullOrWhiteSpace($slug)) {
        return "unknown"
    }

    return $slug
}

function ConvertTo-Value {
    param($Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
        return $null
    }

    $text = ([string]$Value).Trim()

    if ($text -match "^\s*(-?\d+)\s*(?:to|-)\s*(-?\d+)\s*$") {
        return [ordered]@{
            min = [int]$Matches[1]
            max = [int]$Matches[2]
        }
    }

    if ($text -match "^-?\d+(?:\.0+)?$") {
        return [int][decimal]$text
    }

    if ($text -match "\D") {
        return "UNSOLVED"
    }

    return [int]$text
}

function Get-Status {
    param($Value)

    if ([string]::IsNullOrWhiteSpace([string]$Value)) {
        return "unknown"
    }

    return ([string]$Value).Trim().ToLowerInvariant()
}

function Get-LabelParts {
    param(
        [Parameter(Mandatory)][string]$DisplayName,
        [string]$Character
    )

    $label = $DisplayName.Trim()
    $head = $label
    $total = $null
    $procreation = $null

    if ($head -match "^(?<head>.+?)\s+(?<total>\d+)(?:/(?<procreation>\d+))?$") {
        $head = $Matches["head"].Trim()
        $total = [int]$Matches["total"]
        if ($Matches["procreation"]) {
            $procreation = [int]$Matches["procreation"]
        }
    }

    if ([string]::IsNullOrWhiteSpace($Character)) {
        $tokens = $head -split "\s+", 2
        $Character = $tokens[0]
        $callName = if ($tokens.Count -gt 1) { $tokens[1] } else { $head }
    } else {
        $escaped = [regex]::Escape($Character.Trim())
        if ($head -match "^\s*$escaped\s+(.+?)\s*$") {
            $callName = $Matches[1]
        } else {
            $callName = $head
        }
    }

    [ordered]@{
        displayName = $label
        character = $Character.Trim()
        callName = $callName.Trim()
        total = $total
        procreation = $procreation
    }
}

function Write-JsonArray {
    param(
        [Parameter(Mandatory)]$Data,
        [Parameter(Mandatory)][string]$Path
    )

    $array = @($Data | ForEach-Object { $_ })
    if ($array.Count -eq 0) {
        $json = "[]"
    } else {
        $json = $array | ConvertTo-Json -Depth 30
    }

    Set-Content -Path $Path -Value $json -Encoding UTF8
}

function Get-XlsxColumnIndex {
    param([Parameter(Mandatory)][string]$CellReference)

    $letters = ($CellReference -replace "[^A-Z]", "")
    $index = 0
    foreach ($char in $letters.ToCharArray()) {
        $index = ($index * 26) + ([int][char]$char - [int][char]'A' + 1)
    }
    return $index
}

function Read-XlsxXmlEntry {
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

function Get-XlsxCellText {
    param(
        [Parameter(Mandatory)]$Cell,
        [Parameter(Mandatory)]$SharedStrings
    )

    if ($Cell.t -eq "s") {
        if ($null -eq $Cell.v) { return "" }
        return $SharedStrings[[int]$Cell.v]
    }

    if ($Cell.t -eq "inlineStr") {
        return [string]$Cell.is.t
    }

    if ($null -eq $Cell.v) {
        return ""
    }

    return [string]$Cell.v
}

function Import-XlsxSheet {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$SheetName
    )

    $resolvedPath = Resolve-Path $Path
    $zip = [System.IO.Compression.ZipFile]::OpenRead($resolvedPath)
    try {
        $sharedStrings = @()
        $sharedStringsXml = Read-XlsxXmlEntry -Zip $zip -EntryName "xl/sharedStrings.xml"
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

        $workbook = Read-XlsxXmlEntry -Zip $zip -EntryName "xl/workbook.xml"
        $relationships = Read-XlsxXmlEntry -Zip $zip -EntryName "xl/_rels/workbook.xml.rels"
        $relationshipTargets = @{}
        foreach ($rel in $relationships.Relationships.Relationship) {
            $relationshipTargets[$rel.Id] = $rel.Target
        }

        $sheet = $workbook.workbook.sheets.sheet | Where-Object { $_.name -eq $SheetName } | Select-Object -First 1
        if ($null -eq $sheet) {
            throw "Sheet not found: $SheetName"
        }

        $relationshipId = $sheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
        $target = $relationshipTargets[$relationshipId]
        if ($target -notlike "xl/*") {
            $target = "xl/$target"
        }

        $sheetXml = Read-XlsxXmlEntry -Zip $zip -EntryName $target
        $rows = @($sheetXml.worksheet.sheetData.row)
        if ($rows.Count -eq 0) {
            return @()
        }

        $headerByColumn = @{}
        foreach ($cell in $rows[0].c) {
            $column = Get-XlsxColumnIndex $cell.r
            $header = Get-XlsxCellText -Cell $cell -SharedStrings $sharedStrings
            if (-not [string]::IsNullOrWhiteSpace($header)) {
                $headerByColumn[$column] = $header.Trim()
            }
        }

        $objects = @()
        foreach ($row in ($rows | Select-Object -Skip 1)) {
            $obj = [ordered]@{}
            foreach ($column in $headerByColumn.Keys) {
                $obj[$headerByColumn[$column]] = $null
            }

            foreach ($cell in $row.c) {
                $column = Get-XlsxColumnIndex $cell.r
                if ($headerByColumn.ContainsKey($column)) {
                    $obj[$headerByColumn[$column]] = Get-XlsxCellText -Cell $cell -SharedStrings $sharedStrings
                }
            }

            $hasValue = $false
            foreach ($value in $obj.Values) {
                if (-not [string]::IsNullOrWhiteSpace([string]$value)) {
                    $hasValue = $true
                    break
                }
            }

            if ($hasValue) {
                $objects += [pscustomobject]$obj
            }
        }

        return $objects
    } finally {
        $zip.Dispose()
    }
}

if (-not (Test-Path $OutputPath)) {
    New-Item -Path $OutputPath -ItemType Directory | Out-Null
}

$humansByName = [ordered]@{}
$charactersByName = [ordered]@{}
$caninesByDisplayName = [ordered]@{}
$traitProfilesByCanineId = [ordered]@{}
$lineageProfilesByCanineId = [ordered]@{}
$sourceObservations = New-Object System.Collections.Generic.List[object]
$seenSourceIds = @{}

function Ensure-Human {
    param([string]$DisplayName)

    if ([string]::IsNullOrWhiteSpace($DisplayName)) {
        $DisplayName = "Unknown"
    }

    $DisplayName = $DisplayName.Trim()
    if (-not $humansByName.Contains($DisplayName)) {
        $humansByName[$DisplayName] = [ordered]@{
            id = "human-$(ConvertTo-CanonicalIdPart $DisplayName)"
            displayName = $DisplayName
            contact = $null
            status = "active"
        }
    }

    return $humansByName[$DisplayName]
}

function Ensure-Character {
    param(
        [string]$Name,
        [string]$HumanName
    )

    if ([string]::IsNullOrWhiteSpace($Name)) {
        $Name = "Unknown"
    }

    $Name = $Name.Trim()
    $human = Ensure-Human $HumanName

    if (-not $charactersByName.Contains($Name)) {
        $charactersByName[$Name] = [ordered]@{
            id = "character-$(ConvertTo-CanonicalIdPart $Name)"
            name = $Name
            humanId = $human.id
            status = "active"
        }
    } elseif ($charactersByName[$Name].humanId -eq "human-unknown" -and $human.id -ne "human-unknown") {
        $charactersByName[$Name].humanId = $human.id
    }

    return $charactersByName[$Name]
}

function Ensure-Canine {
    param(
        [Parameter(Mandatory)][string]$DisplayName,
        [string]$CharacterName,
        [string]$HumanName,
        [string]$Gender,
        [string]$Status,
        $Appearance
    )

    $parts = Get-LabelParts -DisplayName $DisplayName -Character $CharacterName
    $character = Ensure-Character -Name $parts.character -HumanName $HumanName
    $key = $parts.displayName

    if (-not $caninesByDisplayName.Contains($key)) {
        $caninesByDisplayName[$key] = [ordered]@{
            id = "canine-$(ConvertTo-CanonicalIdPart $key)"
            externalIds = [ordered]@{}
            callName = $parts.callName
            displayName = $parts.displayName
            characterId = $character.id
            gender = if ([string]::IsNullOrWhiteSpace($Gender)) { "U" } else { $Gender.Trim().ToUpperInvariant() }
            canineType = $null
            appearance = $null
            status = Get-Status $Status
        }
    } else {
        $canine = $caninesByDisplayName[$key]
        if ($canine.gender -eq "U" -and -not [string]::IsNullOrWhiteSpace($Gender)) {
            $canine.gender = $Gender.Trim().ToUpperInvariant()
        }
        if ($canine.status -in @("unknown", "inactive", "retired") -and (Get-Status $Status) -eq "active") {
            $canine.status = "active"
        }
        if ($canine.characterId -eq "character-unknown" -and $character.id -ne "character-unknown") {
            $canine.characterId = $character.id
        }
    }

    $canine = $caninesByDisplayName[$key]

    if ($null -ne $Appearance) {
        $canine.appearance = $Appearance
    }

    if (-not $lineageProfilesByCanineId.Contains($canine.id)) {
        $lineageProfilesByCanineId[$canine.id] = [ordered]@{
            canineId = $canine.id
            sireId = $null
            damId = $null
            paternalGrandSireId = $null
            paternalGrandDamId = $null
            maternalGrandSireId = $null
            maternalGrandDamId = $null
        }
    }

    return $canine
}

function Add-SourceObservation {
    param(
        [Parameter(Mandatory)][string]$EntityType,
        [Parameter(Mandatory)][string]$EntityId,
        [Parameter(Mandatory)][string]$Source,
        [string]$Notes
    )

    $baseId = "source-$(ConvertTo-CanonicalIdPart "$Source-$EntityType-$EntityId")"
    $id = $baseId
    $i = 2
    while ($seenSourceIds.ContainsKey($id)) {
        $id = "$baseId-$i"
        $i++
    }
    $seenSourceIds[$id] = $true

    $sourceObservations.Add([ordered]@{
        id = $id
        entityType = $EntityType
        entityId = $EntityId
        source = $Source
        sourceObservedAt = $null
        sourceLag = $null
        externalId = $null
        notes = $Notes
    })
}

$knownRowsImported = 0
foreach ($path in $KnownsPaths) {
    if (-not (Test-Path $path)) {
        Write-Warning "Knowns file not found: $path"
        continue
    }

    $source = Split-Path $path -Leaf
    $rows = Import-Csv -Path $path | Where-Object { -not [string]::IsNullOrWhiteSpace($_.Name) }
    foreach ($row in $rows) {
        $canine = Ensure-Canine -DisplayName $row.Name -CharacterName $row.Character -HumanName $row.Person -Gender $row.Gender -Status $row.Status

        $traitValues = [ordered]@{}
        foreach ($trait in $traits) {
            $traitValues[$trait] = ConvertTo-Value $row.$trait
        }

        $traitProfilesByCanineId[$canine.id] = [ordered]@{
            canineId = $canine.id
            status = if ((Get-Status $row.Status) -eq "active") { "known" } else { Get-Status $row.Status }
            total = ConvertTo-Value $row.TOTAL
            traits = $traitValues
        }

        Add-SourceObservation -EntityType "canine" -EntityId $canine.id -Source "legacy/$source" -Notes "Imported from legacy known trait data."
        $knownRowsImported++
    }
}

$breederRowsImported = 0
foreach ($path in $BreedersPaths) {
    if (-not (Test-Path $path)) {
        Write-Warning "Breeders file not found: $path"
        continue
    }

    $source = Split-Path $path -Leaf
    $rows = Import-Csv -Path $path | Where-Object {
        -not [string]::IsNullOrWhiteSpace($_.NAME) -and $_.NAME -ne "Character Pet UniqueID"
    }

    foreach ($row in $rows) {
        $canine = Ensure-Canine -DisplayName $row.NAME -HumanName $row.OWNER -Gender $row.GENDER -Status $row.Status
        $lineage = $lineageProfilesByCanineId[$canine.id]

        $sire = if ([string]::IsNullOrWhiteSpace($row.CLOSE1) -or $row.CLOSE1 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.CLOSE1 -HumanName "Unknown" -Status "unknown" }
        $dam = if ([string]::IsNullOrWhiteSpace($row.CLOSE2) -or $row.CLOSE2 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.CLOSE2 -HumanName "Unknown" -Status "unknown" }
        $pgs = if ([string]::IsNullOrWhiteSpace($row.PARTIAL1) -or $row.PARTIAL1 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL1 -HumanName "Unknown" -Status "unknown" }
        $pgd = if ([string]::IsNullOrWhiteSpace($row.PARTIAL2) -or $row.PARTIAL2 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL2 -HumanName "Unknown" -Status "unknown" }
        $mgs = if ([string]::IsNullOrWhiteSpace($row.PARTIAL3) -or $row.PARTIAL3 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL3 -HumanName "Unknown" -Status "unknown" }
        $mgd = if ([string]::IsNullOrWhiteSpace($row.PARTIAL4) -or $row.PARTIAL4 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL4 -HumanName "Unknown" -Status "unknown" }

        $lineage.sireId = if ($sire) { $sire.id } else { $null }
        $lineage.damId = if ($dam) { $dam.id } else { $null }
        $lineage.paternalGrandSireId = if ($pgs) { $pgs.id } else { $null }
        $lineage.paternalGrandDamId = if ($pgd) { $pgd.id } else { $null }
        $lineage.maternalGrandSireId = if ($mgs) { $mgs.id } else { $null }
        $lineage.maternalGrandDamId = if ($mgd) { $mgd.id } else { $null }

        if (-not $traitProfilesByCanineId.Contains($canine.id)) {
            $traitProfilesByCanineId[$canine.id] = [ordered]@{
                canineId = $canine.id
                status = "summary"
                total = ConvertTo-Value $row.TRAITS
                traits = $null
            }
        }

        Add-SourceObservation -EntityType "canine" -EntityId $canine.id -Source "legacy/$source" -Notes "Imported from legacy breeder lineage data."
        $breederRowsImported++
    }
}

$workbookRowsImported = 0
if (Test-Path $WorkbookPath) {
    $workbookRows = Import-XlsxSheet -Path $WorkbookPath -SheetName "Breeders" | Where-Object {
        -not [string]::IsNullOrWhiteSpace($_.NAME) -and $_.NAME -ne "NPC"
    }

    foreach ($row in $workbookRows) {
        $appearance = $null
        if (-not [string]::IsNullOrWhiteSpace($row.PColor) -or
            -not [string]::IsNullOrWhiteSpace($row.SColor) -or
            -not [string]::IsNullOrWhiteSpace($row.Eyes)) {
            $appearance = [ordered]@{
                primaryColor = if ([string]::IsNullOrWhiteSpace($row.PColor)) { $null } else { $row.PColor.Trim() }
                secondaryColor = if ([string]::IsNullOrWhiteSpace($row.SColor)) { $null } else { $row.SColor.Trim() }
                eyeColor = if ([string]::IsNullOrWhiteSpace($row.Eyes)) { $null } else { $row.Eyes.Trim() }
            }
        }

        $canine = Ensure-Canine -DisplayName $row.NAME -HumanName $row.OWNER -Gender $row.Gender -Status "unknown" -Appearance $appearance
        $lineage = $lineageProfilesByCanineId[$canine.id]

        $sire = if ([string]::IsNullOrWhiteSpace($row.CLOSE1) -or $row.CLOSE1 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.CLOSE1 -HumanName "Unknown" -Status "unknown" }
        $dam = if ([string]::IsNullOrWhiteSpace($row.CLOSE2) -or $row.CLOSE2 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.CLOSE2 -HumanName "Unknown" -Status "unknown" }
        $pgs = if ([string]::IsNullOrWhiteSpace($row.PARTIAL1) -or $row.PARTIAL1 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL1 -HumanName "Unknown" -Status "unknown" }
        $pgd = if ([string]::IsNullOrWhiteSpace($row.PARTIAL2) -or $row.PARTIAL2 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL2 -HumanName "Unknown" -Status "unknown" }
        $mgs = if ([string]::IsNullOrWhiteSpace($row.PARTIAL3) -or $row.PARTIAL3 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL3 -HumanName "Unknown" -Status "unknown" }
        $mgd = if ([string]::IsNullOrWhiteSpace($row.PARTIAL4) -or $row.PARTIAL4 -eq "NPC") { $null } else { Ensure-Canine -DisplayName $row.PARTIAL4 -HumanName "Unknown" -Status "unknown" }

        $lineage.sireId = if ($sire) { $sire.id } else { $null }
        $lineage.damId = if ($dam) { $dam.id } else { $null }
        $lineage.paternalGrandSireId = if ($pgs) { $pgs.id } else { $null }
        $lineage.paternalGrandDamId = if ($pgd) { $pgd.id } else { $null }
        $lineage.maternalGrandSireId = if ($mgs) { $mgs.id } else { $null }
        $lineage.maternalGrandDamId = if ($mgd) { $mgd.id } else { $null }

        $traitValues = [ordered]@{
            Alertness = ConvertTo-Value $row.Alertness
            Appetite = ConvertTo-Value $row.Appetite
            Brutality = ConvertTo-Value $row.Brutality
            Development = ConvertTo-Value $row.Devel
            Eluding = ConvertTo-Value $row.Eluding
            Energy = ConvertTo-Value $row.Energy
            Evasion = ConvertTo-Value $row.Evasion
            Ferocity = ConvertTo-Value $row.Ferocity
            Fortitude = ConvertTo-Value $row.Fortitude
            Insight = ConvertTo-Value $row.Insight
            Might = ConvertTo-Value $row.Might
            Nimbleness = ConvertTo-Value $row.Nimbleness
            Patience = ConvertTo-Value $row.Patience
            Procreation = ConvertTo-Value $row.Procreation
            Sufficiency = ConvertTo-Value $row.Sufficiency
            Targeting = ConvertTo-Value $row.Targeting
            Toughness = ConvertTo-Value $row.Toughness
        }

        $hasTraitValue = $false
        foreach ($value in $traitValues.Values) {
            if ($null -ne $value) {
                $hasTraitValue = $true
                break
            }
        }

        if ($hasTraitValue) {
            $traitProfilesByCanineId[$canine.id] = [ordered]@{
                canineId = $canine.id
                status = "known"
                total = ConvertTo-Value $row.TRAITS
                traits = $traitValues
            }
        } elseif (-not $traitProfilesByCanineId.Contains($canine.id)) {
            $traitProfilesByCanineId[$canine.id] = [ordered]@{
                canineId = $canine.id
                status = "summary"
                total = ConvertTo-Value $row.TRAITS
                traits = $null
            }
        }

        Add-SourceObservation -EntityType "canine" -EntityId $canine.id -Source "workbook/Doli-Path.xlsx#Breeders" -Notes "Imported from reviewed private planning workbook Breeders sheet."
        $workbookRowsImported++
    }
} else {
    Write-Warning "Workbook not found; skipping workbook import: $WorkbookPath"
}

Write-JsonArray -Data $humansByName.Values -Path (Join-Path $OutputPath "humans.json")
Write-JsonArray -Data $charactersByName.Values -Path (Join-Path $OutputPath "characters.json")
Write-JsonArray -Data $caninesByDisplayName.Values -Path (Join-Path $OutputPath "canines.json")
Write-JsonArray -Data $traitProfilesByCanineId.Values -Path (Join-Path $OutputPath "trait-profiles.json")
Write-JsonArray -Data $lineageProfilesByCanineId.Values -Path (Join-Path $OutputPath "lineage-profiles.json")
Write-JsonArray -Data $sourceObservations -Path (Join-Path $OutputPath "source-observations.json")

Write-Host "Imported $knownRowsImported known trait rows."
Write-Host "Imported $breederRowsImported breeder lineage rows."
Write-Host "Imported $workbookRowsImported workbook breeder rows."
Write-Host "Wrote $($humansByName.Count) humans, $($charactersByName.Count) characters, $($caninesByDisplayName.Count) canines."
