import * as React from 'react';
import { EDM_CLASS } from '@/lib/email/responsive';
import { useSelectable } from '@/builder/preview/PreviewEditContext';

export interface StatItemProps {
  value: string;
  label: string;
  valueColor?: string;
}

export interface StatsRowProps {
  stats: [StatItemProps, StatItemProps, StatItemProps];
  backgroundColor?: string;
  deskPadding?: string;
  gutterWidth?: number;
  valueFontSize?: string;
  labelFontSize?: string;
  defaultValueColor?: string;
  labelColor?: string;
}

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function StatCell({
  stat,
  width,
  valueFontSize,
  labelFontSize,
  defaultValueColor,
  labelColor,
}: {
  stat: StatItemProps;
  width: number;
  valueFontSize: string;
  labelFontSize: string;
  defaultValueColor: string;
  labelColor: string;
}) {
  const statsSel = useSelectable('stats');
  return (
    <td
      align="center"
      valign="top"
      width={width}
      className={EDM_CLASS.stackCell}
      style={{ width: `${width}px`, fontFamily }}
    >
      <p
        {...statsSel}
        style={{
          margin: '0 0 6px 0',
          fontSize: valueFontSize,
          fontWeight: 700,
          lineHeight: '32px',
          color: stat.valueColor ?? defaultValueColor,
        }}
      >
        {stat.value}
      </p>
      <p
        {...statsSel}
        style={{
          margin: 0,
          fontSize: labelFontSize,
          lineHeight: '18px',
          color: labelColor,
        }}
      >
        {stat.label}
      </p>
    </td>
  );
}

export const StatsRow: React.FC<StatsRowProps> = ({
  stats,
  backgroundColor = '#f7f8f8',
  deskPadding = '32px 40px',
  gutterWidth = 16,
  valueFontSize = '28px',
  labelFontSize = '12px',
  defaultValueColor = '#000000',
  labelColor = '#666666',
}) => {
  const colWidth = Math.floor((520 - gutterWidth * 2) / 3);

  return (
    <table
      width={600}
      cellPadding={0}
      cellSpacing={0}
      className={EDM_CLASS.wrapper}
      style={{ width: '600px', backgroundColor }}
      role="presentation"
    >
      <tr>
        <td align="center" valign="top" className={EDM_CLASS.pad} style={{ padding: deskPadding }}>
          <table
            width={520}
            cellPadding={0}
            cellSpacing={0}
            className={EDM_CLASS.fluid}
            style={{ width: '520px' }}
            role="presentation"
          >
            <tr className={EDM_CLASS.stackRow}>
              <StatCell
                stat={stats[0]}
                width={colWidth}
                valueFontSize={valueFontSize}
                labelFontSize={labelFontSize}
                defaultValueColor={defaultValueColor}
                labelColor={labelColor}
              />
              <td
                width={gutterWidth}
                className={EDM_CLASS.colHide}
                style={{ width: `${gutterWidth}px` }}
              />
              <StatCell
                stat={stats[1]}
                width={colWidth}
                valueFontSize={valueFontSize}
                labelFontSize={labelFontSize}
                defaultValueColor={defaultValueColor}
                labelColor={labelColor}
              />
              <td
                width={gutterWidth}
                className={EDM_CLASS.colHide}
                style={{ width: `${gutterWidth}px` }}
              />
              <StatCell
                stat={stats[2]}
                width={colWidth}
                valueFontSize={valueFontSize}
                labelFontSize={labelFontSize}
                defaultValueColor={defaultValueColor}
                labelColor={labelColor}
              />
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
};

export default StatsRow;
