import { NextResponse } from 'next/server';
import {
  getRegistryEntries,
  getRegistryEntriesByCategory,
  getPaletteEntriesByCategory,
} from '@/lib/registry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const components = getRegistryEntries();
  const byCategory = getRegistryEntriesByCategory();
  const paletteByCategory = getPaletteEntriesByCategory();

  return NextResponse.json({
    components,
    byCategory,
    paletteByCategory,
    total: components.length,
  });
}
