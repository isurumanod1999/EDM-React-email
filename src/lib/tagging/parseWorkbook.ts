import ExcelJS from 'exceljs';
import {
  classifyFinalUrl,
  mapHeaderToField,
  normalizeHeader,
  type HeaderField,
  type ParseTaggingResult,
  type TaggingRow,
} from '@/lib/tagging/types';

function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof (value as { text?: unknown }).text === 'string') {
      return (value as { text: string }).text;
    }
    if ('result' in value && (value as { result?: unknown }).result != null) {
      return String((value as { result: unknown }).result);
    }
    if ('richText' in value && Array.isArray((value as { richText: { text: string }[] }).richText)) {
      return (value as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
    }
    if ('hyperlink' in value) {
      const hl = value as { text?: string; hyperlink?: string };
      return hl.text ?? hl.hyperlink ?? '';
    }
  }
  return String(value);
}

function buildColumnMap(headerRow: ExcelJS.Row): Map<number, HeaderField> {
  const map = new Map<number, HeaderField>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const field = mapHeaderToField(normalizeHeader(cellToString(cell.value)));
    if (field && ![...map.values()].includes(field)) {
      map.set(colNumber, field);
    }
  });
  return map;
}

/**
 * Parse a tagging workbook buffer (Book1-style) into TaggingRow[].
 * Uses the first worksheet. exceljs must stay server-side (AD-17).
 */
export async function parseTaggingWorkbook(buffer: ArrayBuffer | Buffer | Uint8Array): Promise<ParseTaggingResult> {
  const workbook = new ExcelJS.Workbook();
  const nodeBuffer = Buffer.from(
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(buffer as Buffer)
  );

  await workbook.xlsx.load(nodeBuffer as unknown as ExcelJS.Buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], sheetName: undefined };
  }

  const headerRow = worksheet.getRow(1);
  const columnMap = buildColumnMap(headerRow);
  if (![...columnMap.values()].includes('finalUrl')) {
    throw new Error('Sheet is missing a FINAL URL column');
  }

  const rows: TaggingRow[] = [];
  const maxRow = worksheet.rowCount;

  for (let r = 2; r <= maxRow; r++) {
    const excelRow = worksheet.getRow(r);
    const raw: Record<string, string> = {};
    let finalUrl = '';
    let urlLabel = '';
    let altText = '';

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const text = cellToString(cell.value).trim();
      const headerCell = headerRow.getCell(colNumber);
      const headerKey = normalizeHeader(cellToString(headerCell.value)) || `col_${colNumber}`;
      if (text) raw[headerKey] = cellToString(cell.value);

      const field = columnMap.get(colNumber);
      if (field === 'finalUrl') finalUrl = cellToString(cell.value);
      if (field === 'urlLabel') urlLabel = cellToString(cell.value).trim();
      if (field === 'altText') altText = cellToString(cell.value).trim();
    });

    // Skip completely empty rows
    if (!finalUrl.trim() && !urlLabel && !altText && Object.keys(raw).length === 0) {
      continue;
    }

    const classification = classifyFinalUrl(finalUrl);
    if (!classification.ok) {
      rows.push({
        rowIndex: r,
        finalUrl: finalUrl.trim(),
        urlLabel,
        altText: altText || undefined,
        status: 'skipped',
        skipReason: classification.reason,
        raw,
      });
      continue;
    }

    rows.push({
      rowIndex: r,
      finalUrl, // literal — do not trim away intentional spacing inside tokens; trim outer only
      urlLabel,
      altText: altText || undefined,
      status: 'proposed',
      raw,
    });
    // Preserve outer trim for storage consistency but keep CRM tokens inside
    rows[rows.length - 1].finalUrl = finalUrl.trim();
  }

  return { rows, sheetName: worksheet.name };
}
