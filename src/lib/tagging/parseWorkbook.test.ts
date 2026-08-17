import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { parseTaggingWorkbook } from '@/lib/tagging/parseWorkbook';
import { classifyFinalUrl, mapHeaderToField, normalizeHeader } from '@/lib/tagging/types';

async function workbookBuffer(rows: unknown[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Tagging');
  for (const row of rows) {
    ws.addRow(row);
  }
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

describe('normalizeHeader / mapHeaderToField', () => {
  it('collapses multiline Book1-style headers', () => {
    expect(normalizeHeader('FINAL URL')).toBe('final url');
    expect(
      normalizeHeader('URL Label\n\nUsed in AC reporting to differentiate content/object')
    ).toBe('url label used in ac reporting to differentiate content/object');
    expect(mapHeaderToField(normalizeHeader('FINAL URL'))).toBe('finalUrl');
    expect(
      mapHeaderToField(
        normalizeHeader('Alt Text \n\nDisplays short message when you hover')
      )
    ).toBe('altText');
  });
});

describe('classifyFinalUrl', () => {
  it('accepts https URLs with CRM tokens intact', () => {
    const url =
      'https://www.nissan.com.au/?utm_source=CRM&cid=x_<%= message.delivery.internalName %>';
    expect(classifyFinalUrl(url)).toEqual({ ok: true });
  });

  it('skips Mirror/Unsubscribe includes', () => {
    expect(classifyFinalUrl("<%@ include view='MirrorPageUrl' %>").ok).toBe(false);
    expect(classifyFinalUrl("<%@ include view='nmaLCUnsubsciptionURL' %>").ok).toBe(false);
  });

  it('skips empty FINAL URL', () => {
    expect(classifyFinalUrl('').ok).toBe(false);
  });
});

describe('parseTaggingWorkbook', () => {
  it('parses happy-path rows with messy headers and preserves CRM tokens', async () => {
    const buf = await workbookBuffer([
      [
        'FINAL URL',
        'URL Label\n\nUsed in AC reporting',
        'Alt Text \n\nDisplays short message',
      ],
      [
        'https://www.nissan.com.au/?cid=crm_x_<%= message.delivery.internalName %>',
        'header-nissanlogo',
        'Nissan Icon',
      ],
      [
        'https://www.nissan.com.au/vehicles/browse-range/all-new-patrol.html?utm_content=hero',
        'hero',
        '1% Finance~. Hurry, ends Dec 21',
      ],
    ]);

    const result = await parseTaggingWorkbook(buf);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].status).toBe('proposed');
    expect(result.rows[0].urlLabel).toBe('header-nissanlogo');
    expect(result.rows[0].altText).toBe('Nissan Icon');
    expect(result.rows[0].finalUrl).toContain('<%= message.delivery.internalName %>');
    expect(result.rows[1].urlLabel).toBe('hero');
  });

  it('marks Mirror, Unsubscribe, and empty FINAL URL rows as skipped', async () => {
    const buf = await workbookBuffer([
      ['FINAL URL', 'URL Label', 'Alt Text'],
      ["<%@ include view='MirrorPageUrl' %>", 'View Online', 'View Online'],
      [
        'https://www.nissan.com.au/?utm_content=hero',
        'hero',
        'Hero alt',
      ],
      ["<%@ include view='nmaLCUnsubsciptionURL' %>", 'Unsubscribe', 'Unsubscribe'],
      ['', 'orphan-label', ''],
    ]);

    const result = await parseTaggingWorkbook(buf);
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0].status).toBe('skipped');
    expect(result.rows[0].skipReason).toMatch(/CRM include/i);
    expect(result.rows[1].status).toBe('proposed');
    expect(result.rows[2].status).toBe('skipped');
    expect(result.rows[3].status).toBe('skipped');
    expect(result.rows[3].skipReason).toMatch(/Missing FINAL URL/i);
  });
});
